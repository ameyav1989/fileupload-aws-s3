require("dotenv").config();
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const AWS = require("aws-sdk");
const fse = require("fs-extra");
const { getBucketObjectList, putObjectInBucket } = require("./s3-utils/s3Client");

const app = express();
const uploadDir = path.join(__dirname, "uploads");

// Ensure the upload directory exists
fse.ensureDirSync(uploadDir);

// AWS S3 Configuration
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
});

const bucketName = process.env.AWS_BUCKET_NAME;

// Multer Storage Setup
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
    getBucketObjectList(bucketName);
    // If all chunks are received, merge and upload to S3
    if (parseInt(index) === parseInt(totalChunks) - 1) {
        const finalFilePath = await mergeChunks(fileName, totalChunks);
        // await uploadToS3(finalFilePath, fileName);
        let putResp = await putObjectInBucket(bucketName, finalFilePath, fileName);
        console.log("putResp", putResp);
    }

    res.status(200).send("Chunk received");
});

// Merge chunks after the last part arrives
async function mergeChunks(fileName, totalChunks) {
    const filePath = path.join(uploadDir, fileName);
    const writeStream = fs.createWriteStream(filePath);

    for (let i = 0; i < totalChunks; i++) {
        const chunkPath = path.join(uploadDir, `${fileName}.part${i}`);
        const data = fs.readFileSync(chunkPath);
        writeStream.write(data);
        fs.unlinkSync(chunkPath); // Delete chunk after merging
    }

    writeStream.end();
    console.log(`File ${fileName} successfully merged.`);
    return filePath;
}

// Upload the merged file to S3
async function uploadToS3(filePath, fileName) {
    const fileStream = fs.createReadStream(filePath);

    const params = {
        Bucket: bucketName,
        Key: `uploads/${fileName}`,
        Body: fileStream,
    };

    try {
        const uploadResult = await s3.upload(params).promise();
        console.log(`File uploaded to S3: ${uploadResult.Location}`);
        fs.unlinkSync(filePath); // Delete local file after upload
    } catch (error) {
        console.error("S3 Upload Error:", error);
    }
}

// Start Server
app.listen(3000, () => console.log("Server running on port 3000"));
