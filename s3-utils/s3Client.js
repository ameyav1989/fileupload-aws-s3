require("dotenv").config();
const Minio = require("minio");
const fs = require("fs");

const s3Client = new Minio.Client({
    endPoint: 's3.amazonaws.com',
    accessKey: process.env.AWS_ACCESS_KEY_ID,
    secretKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// console.log(s3Client);

// List all object paths in bucket my-bucketname.
const getBucketObjectList = function(bucketName) {
    const objectsList = [];
    const objectsStream = s3Client.listObjects(bucketName, 'uploads', true)

    objectsStream.on('data', function(obj) {
        objectsList.push(obj.name)
    })

    objectsStream.on('error', function(e) {
        console.log(e)
    })

    objectsStream.on('end', async() => {
        console.log(objectsList);
    });
};

const putObjectInBucket = async function(bucketName, filepath, fileName) {

    return new Promise(function(resolve,reject){
        const fileStream = fs.createReadStream(filepath);
        const fileStat = fs.stat(filepath, function(err, stats) {
            if (err) {
                resolve(err);
            }
    
            s3Client.putObject(bucketName, fileName, fileStream, stats.size, function(err, objInfo) {
                if (err) {
                    resolve(err) // err should be null
                } else {
                    resolve(objInfo);
                }
            });
        });
    });

}


module.exports = { getBucketObjectList, putObjectInBucket }