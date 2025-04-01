const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

// Configuration
const FILE_PATH = "/Users/ameya/Downloads/OEADG67_31032025112314.db"; // Replace with your file path
const CHUNK_SIZE = 1024 * 1024; // 1MB
const SERVER_URL = "http://localhost:3000/upload"; // Backend URL

async function uploadFile(filePath) {
    const fileName = path.basename(filePath);
    const fileSize = fs.statSync(filePath).size;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    console.log(`Uploading ${fileName} in ${totalChunks} chunks...`);

    for (let index = 0; index < totalChunks; index++) {
        const start = index * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);

        const chunk = fs.createReadStream(filePath, { start, end: end - 1 });
        const formData = new FormData();
        formData.append("chunk", chunk, `${fileName}.part${index}`);
        formData.append("index", index);
        formData.append("totalChunks", totalChunks);
        formData.append("fileName", fileName);

        try {
            const response = await axios.post(SERVER_URL, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            console.log(`Chunk ${index + 1}/${totalChunks} uploaded successfully.`);
        } catch (error) {
            console.error(`Error uploading chunk ${index + 1}:`, error.message);
            return;
        }
    }

    console.log("Upload completed successfully!");
}

// Start upload
uploadFile(FILE_PATH);