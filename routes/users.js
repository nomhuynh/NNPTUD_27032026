var express = require("express");
var path = require("path");
var router = express.Router();
let exceljs = require("exceljs");
let { uploadExcel } = require("../utils/upload");
let { checkLogin, CheckPermission } = require('../utils/authHandler')
let { userCreateValidator
    , userUpdateValidator
    , handleResultValidator } = require('../utils/validatorHandler')
let userController = require("../controllers/users");
let userModel = require("../schemas/users");

/** POST multipart field "file": Excel có cột username, email (hàng đầu là header). */
router.post(
    "/import-excel",
    checkLogin,
    CheckPermission("ADMIN"),
    uploadExcel.single("file"),
    async function (req, res, next) {
        try {
            if (!req.file) {
                return res.status(400).send({ message: "Thieu file Excel (field: file)" });
            }
            let workbook = new exceljs.Workbook();
            let pathFile = path.join(__dirname, "../uploads", req.file.filename);
            await workbook.xlsx.readFile(pathFile);
            let worksheet = workbook.worksheets[0];
            if (!worksheet) {
                return res.status(400).send({ message: "File khong co sheet" });
            }
            let results = await userController.ImportUsersFromWorksheet(worksheet);
            res.send({ ok: true, results });
        } catch (err) {
            res.status(400).send({ message: err.message || String(err) });
        }
    }
);

router.get("/", checkLogin, CheckPermission("ADMIN")
    , async function (req, res, next) {
        let users = await userController.GetAllUser();
        res.send(users);
    });

router.get("/:id", async function (req, res, next) {
    try {
        let result = await userModel
            .find({ _id: req.params.id, isDeleted: false })
        if (result.length > 0) {
            res.send(result);
        }
        else {
            res.status(404).send({ message: "id not found" });
        }
    } catch (error) {
        res.status(404).send({ message: "id not found" });
    }
});

router.post("/", userCreateValidator, handleResultValidator,
    async function (req, res, next) {
        try {
            let newItem = userController.CreateAnUser(
                req.body.username,
                req.body.password,
                req.body.email,
                req.body.role,
                req.body.fullName,
                req.body.avatarUrl,
                req.body.status,
                req.body.loginCount
            );
            await newItem.save();

            // populate cho đẹp
            let saved = await userModel
                .findById(newItem._id)
                .populate({ path: "role", select: "name" })
            res.send(saved);
        } catch (err) {
            res.status(400).send({ message: err.message });
        }
    });

router.put("/:id", userUpdateValidator, handleResultValidator, async function (req, res, next) {
    try {
        let id = req.params.id;
        //c1
        let updatedItem = await
            userModel.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedItem)
            return res.status(404).send({ message: "id not found" });
        //c2
        // let updatedItem = await userModel.findById(id);
        // if (updatedItem) {
        //     let keys = Object.keys(req.body);
        //     for (const key of keys) {
        //         getUser[key] = req.body[key]
        //     }
        // }
        // await updatedItem.save()
        let populated = await userModel
            .findById(updatedItem._id)
        res.send(populated);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

router.delete("/:id", async function (req, res, next) {
    try {
        let id = req.params.id;
        let updatedItem = await userModel.findByIdAndUpdate(
            id,
            { isDeleted: true },
            { new: true }
        );
        if (!updatedItem) {
            return res.status(404).send({ message: "id not found" });
        }
        res.send(updatedItem);
    } catch (err) {
        res.status(400).send({ message: err.message });
    }
});

module.exports = router;