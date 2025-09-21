import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { UploadService } from "../services/upload-service";
import { MentorService } from "../services/mentor-service";
import { MentorRepository } from "../repositories/mentor-repository";
import { Readable } from "stream";
import csvParser from "csv-parser";
import { MentorEntity, MentorSchema } from "../entities/mentor-entity";

const uploadService = new UploadService(
    process.env.UPLOAD_MENTORS_BUCKET_NAME || '',
    new S3Client({ 
        region: process.env.REGION,
    }),
);

const mentorService = new MentorService(
    new MentorRepository(
        process.env.MENTORS_TABLE_NAME || '',
        new DynamoDBClient({ 
            region: process.env.REGION 
        }),
    ),
);

const sqsClient = new SQSClient({ 
    region: process.env.REGION 
});

export const main = async (event: any) => {
    return await handleProcessUpload(event, { mentorService });
}

export const handleProcessUpload = async (event: any, dependencies: { mentorService: any; }) => {
    console.log("Processing upload")
    try {
        for (const record of event.Records) {
            const fileKey = record.s3.object.key;
            console.log(fileKey)
            const s3Stream = await uploadService.getMentorsImport(fileKey) as Readable;
            if(!s3Stream) {
                console.error(`File not found ${fileKey}`)
                continue;
            }
            let createdMentors: MentorEntity[] = [];
            let failed: number = 0;
            await new Promise((resolve, reject) => {
                s3Stream
                .pipe(csvParser({ separator: "|" }))
                .on("data", async (data) => {
                    try {
                        const transformedData = {
                            ...data,
                            skills: data.skills.split(";"), 
                            experience: Number(data.experience),
                          };
                        const mentor : MentorEntity = MentorSchema.parse(transformedData);
                        await dependencies.mentorService.createMentor(mentor);
                        createdMentors.push(mentor);
                    } catch (error) {
                        failed++;
                        console.error(error);
                    }
                })
                .on("end", resolve)
                .on("error", reject);
            });
            await sendMentorsImpordedEvent(createdMentors.length, failed);
        }
        return {
           message: 'Mentors import files were successfully processed',
        };
    } catch (error) {
        return {
            error: "Internal Server Error",
        };
    }
};

const sendMentorsImpordedEvent = async(success: number, failed: number): Promise<void> => {
    const mentorsImporderEventBody = {
        type: "mentors.imported", 
        total: success + failed, 
        success: success, 
        failed: failed, 
    }

    console.log(mentorsImporderEventBody);
    const command = new SendMessageCommand({
        QueueUrl: process.env.IMPORT_EXPORT_NOTIFICATIONS_QUEUE_URL,
        MessageBody: JSON.stringify(mentorsImporderEventBody),
    });
  
    await sqsClient.send(command);
}