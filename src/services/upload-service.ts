import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parse } from "parse-multipart-data";

export class UploadService {
    private readonly s3Client: S3Client;
    private readonly uploadMentorsBucketName: string;

    constructor(uploadMentorsBucketName: string, s3Client: S3Client) {
        this.uploadMentorsBucketName = uploadMentorsBucketName;
        this.s3Client = s3Client;
    }

    async uploadMentorsImport(body: string, boundary: string): Promise<void> {
        const timestamp = Date.now();
        const key = `mentors-import/${timestamp}/mentors.csv`;
        try {
            const bodyBuffer = Buffer.from(body);
            const parts = parse(bodyBuffer, boundary);
            const mentorsData = parts.map((part) => part.data.toString()).join("\n");
        
            await this.s3Client.send(
            new PutObjectCommand({
                Bucket: this.uploadMentorsBucketName,
                Key: key,
                Body: mentorsData,
                ContentType: "text/csv",
            })
            );
        } catch (error) {
            console.error(`Error uploading mentors import with key ${key}:`, error);
            throw new Error(`Failed to upload mentors import with key ${key}`);
        }
    }

    async getMentorsImport(key: string) {
        try {
            const command = new GetObjectCommand({ 
                Bucket: this.uploadMentorsBucketName, 
                Key: key 
            });
            const importFileResponse = await this.s3Client.send(command);

            return importFileResponse.Body ? importFileResponse.Body: null
        } catch (error) {
            console.error(`Error getting mentors import for key ${key}:`, error);
            throw new Error(`Failed to get mentors import for key ${key}`);
        }
    } 

}