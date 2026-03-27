const crypto = require("crypto");
let userModel = require('../schemas/users');
let roleModel = require('../schemas/roles');
let mailHandler = require('../utils/senMailHandler');

function randomPassword16() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    const bytes = crypto.randomBytes(16);
    let out = "";
    for (let i = 0; i < 16; i++) {
        out += chars[bytes[i] % chars.length];
    }
    return out;
}

module.exports = {
    CreateAnUser: function (username, password,
        email, role, fullname, avatar, status, logincount) {
        return new userModel(
            {
                username: username,
                password: password,
                email: email,
                fullName: fullname,
                avatarUrl: avatar,
                status: status,
                role: role,
                loginCount: logincount
            }
        )
    },
    FindByUsername: async function (username) {
        return await userModel.findOne({
            username: username,
            isDeleted: false
        })
    }, 
    FindByEmail: async function (email) {
        return await userModel.findOne({
            email: email,
            isDeleted: false
        })
    },
    FindByToken: async function (token) {
        return await userModel.findOne({
            resetPasswordToken: token,
            isDeleted: false
        })
    },
    FailLogin: async function (user) {
        user.loginCount++;
        if (user.loginCount == 3) {
            user.loginCount = 0;
            user.lockTime = new Date(Date.now() + 60 * 60 * 1000)
        }
        await user.save()
    },
    SuccessLogin: async function (user) {
        user.loginCount = 0;
        await user.save()
    },
    GetAllUser: async function () {
        return await userModel
            .find({ isDeleted: false }).populate({
                path: 'role',
                select: 'name'
            })
    },
    FindById: async function (id) {
        try {
            let getUser = await userModel
                .findOne({ isDeleted: false, _id: id }).populate({
                    path: 'role',
                    select: 'name'
                })
            return getUser;
        } catch (error) {
            return false
        }
    },
    /**
     * Đọc sheet đầu tiên: hàng 1 là tiêu đề (username, email), từ hàng 2 là dữ liệu.
     * Mật khẩu ngẫu nhiên 16 ký tự, role "user", gửi email chứa mật khẩu.
     */
    ImportUsersFromWorksheet: async function (worksheet) {
        const userRole = await roleModel.findOne({
            isDeleted: false,
            name: new RegExp("^user$", "i"),
        });
        if (!userRole) {
            throw new Error('Khong tim thay role "user" trong he thong');
        }

        const headerRow = worksheet.getRow(1);
        let colUsername = 1;
        let colEmail = 2;
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
            const v = String(cell.value ?? "")
                .trim()
                .toLowerCase();
            if (v === "username") colUsername = colNumber;
            if (v === "email") colEmail = colNumber;
        });

        const emailRe = /^\S+@\S+\.\S+$/;
        const results = [];

        for (let row = 2; row <= worksheet.rowCount; row++) {
            const cells = worksheet.getRow(row);
            const rawU = cells.getCell(colUsername).value;
            const rawE = cells.getCell(colEmail).value;
            const username = String(rawU ?? "")
                .trim();
            const email = String(rawE ?? "")
                .trim()
                .toLowerCase();

            if (!username && !email) {
                continue;
            }

            const rowResult = { row, username, email, status: "pending" };

            if (!username || !email) {
                rowResult.status = "error";
                rowResult.message = "Thieu username hoac email";
                results.push(rowResult);
                continue;
            }
            if (!emailRe.test(email)) {
                rowResult.status = "error";
                rowResult.message = "Email khong hop le";
                results.push(rowResult);
                continue;
            }

            const exists = await userModel.findOne({
                isDeleted: false,
                $or: [{ username }, { email }],
            });
            if (exists) {
                rowResult.status = "error";
                rowResult.message = "Username hoac email da ton tai";
                results.push(rowResult);
                continue;
            }

            const plainPassword = randomPassword16();
            try {
                let newItem = module.exports.CreateAnUser(
                    username,
                    plainPassword,
                    email,
                    userRole._id,
                    "",
                    undefined,
                    false,
                    0
                );
                await newItem.save();
                await mailHandler.sendPasswordToNewUser(
                    email,
                    username,
                    plainPassword
                );
                rowResult.status = "ok";
                rowResult.userId = newItem._id;
                rowResult.message = "Da tao user va gui email mat khau";
            } catch (err) {
                rowResult.status = "error";
                rowResult.message = err.message || String(err);
            }
            results.push(rowResult);
        }

        return results;
    },
}