const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

const app = express();
const uploadDir = path.join(__dirname, "uploads");

// Ensure the upload directory exists
fse.ensureDirSync(uploadDir);

// Multer setup to handle individual chunks
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });

app.post("/upload", upload.single("chunk"), async (req, res) => {
    const { index, totalChunks, fileName } = req.body;
    const chunkPath = path.join(uploadDir, `${fileName}.part${index}`);

    // Move uploaded chunk to the designated folder
    fs.renameSync(req.file.path, chunkPath);

    console.log(`Received chunk ${index}/${totalChunks} for file ${fileName}`);

    // If all chunks are received, merge them
    if (parseInt(index) === parseInt(totalChunks) - 1) {
        await mergeChunks(fileName, totalChunks);
        console.log(`File ${fileName} has been successfully assembled.`);
    }

    res.status(200).send("Chunk received");
});

// Function to merge file chunks
async function mergeChunks(fileName, totalChunks) {
    const filePath = path.join(uploadDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(uploadDir, `${fileName}.part${i}`);
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
        fs.unlinkSync(chunkPath); // Delete the chunk after merging
    }

    writeStream.end();
}



// Start the server
app.listen(3000, () => console.log("Server running on port 3000"));
