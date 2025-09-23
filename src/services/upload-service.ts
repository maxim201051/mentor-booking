import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { parse } from "parse-multipart-data";
import { BookingEntity } from "../entities/booking-entity";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


export class UploadService {
    private readonly s3Client: S3Client;
    private readonly importExportBucketName: string;

    constructor(importExportBucketName: string, s3Client: S3Client) {
        this.importExportBucketName = importExportBucketName;
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
                Bucket: this.importExportBucketName,
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
                Bucket: this.importExportBucketName, 
                Key: key 
            });
            const importFileResponse = await this.s3Client.send(command);

            return importFileResponse.Body ? importFileResponse.Body: null
        } catch (error) {
            console.error(`Error getting mentors import for key ${key}:`, error);
            throw new Error(`Failed to get mentors import for key ${key}`);
        }
    } 

    async uploadBookingsExport(bookings: BookingEntity[]): Promise<string> {
        const timestamp = Date.now();
        const key = `booking-exports/${timestamp}/bookings.csv`;
        try {
            const headers = ["id", "mentorId", "studentId", "timeslotId", "status"];
            const dataRows = bookings.map(item => [item.id, item.mentorId, item.studentId, item.timeslotId, item.status]);
            const csvString = [
                headers.join("|"), 
                ...dataRows.map(row => row.join("|")) 
            ].join("\n"); 

            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.importExportBucketName,
                    Key: key,
                    Body: csvString,
                    ContentType: "text/csv",
                })
            );
            const presignedUrl = await getSignedUrl(this.s3Client, new GetObjectCommand({ Bucket: this.importExportBucketName, Key: key }), { expiresIn: 3600 }); 
            console.log(presignedUrl);
            return presignedUrl;
        } catch (error) {
            console.error(`Error uploading bookings export with key ${key}:`, error);
            throw new Error(`Failed to upload bookings export with key ${key}`);
        }
    }
}