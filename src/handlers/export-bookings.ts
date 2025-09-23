import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TimeSlotService } from "../services/timeslot-service";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { BookingService } from "../services/booking-service";
import { BookingRepository } from "../repositories/booking-repository";
import { UploadService } from "../services/upload-service";
import { S3Client } from "@aws-sdk/client-s3";
import { BookingEntity } from "../entities/booking-entity";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const dynamoDBClient = new DynamoDBClient({ 
    region: process.env.REGION 
});

const timeSlotService = new TimeSlotService(
    new TimeSlotRepository(
        process.env.TIMESLOTS_TABLE_NAME || '',
        dynamoDBClient,
    ), 
);

const bookingService = new BookingService(
    new BookingRepository(
        process.env.BOOKINGS_TABLE_NAME || '',
        dynamoDBClient,
    ),
    timeSlotService,
);

const uploadService = new UploadService(
    process.env.IMPORT_EXPORT_BUCKET_NAME || '',
    new S3Client({ 
        region: process.env.REGION,
    }),
);

const sqsClient = new SQSClient({ 
    region: process.env.REGION 
});

export const main = async (event: any) => {
    return await handleExportBookings(event, { bookingService, uploadService });    
}

export const handleExportBookings = async (event: any, dependencies: { bookingService: BookingService; uploadService: UploadService; }) => {
    for (const record of event.Records) {
        try {
            const bookingExportEvent = JSON.parse(record.body);
            if (bookingExportEvent.task !== "export_bookings") {
                return {
                    message: 'Unexpected event type',
                };
            }

            const bookings = await dependencies.bookingService.getAllBookings();
            console.log(bookings);
            const downloadUrl = await dependencies.uploadService.uploadBookingsExport(bookings);

            await sendBookingsExportedEvent(true, bookings, downloadUrl);  
        } catch (error) {
            console.error(error);
            await sendBookingsExportedEvent(false, [], "");
            throw error;
        }
    }
    return {
        message: "Bookings export events processed",
    };
}

const sendBookingsExportedEvent = async(success: boolean, bookings: BookingEntity[], downloadUrl: string): Promise<void> => {
    const bookingsExportedEvent = {
        type: "bookings.exported",
        exportStatus: success? "success" : "failed",
        recordCount: bookings.length,
        downloadUrl: downloadUrl,
    };

    const command = new SendMessageCommand({
        QueueUrl: process.env.IMPORT_EXPORT_NOTIFICATIONS_QUEUE_URL,
        MessageBody: JSON.stringify(bookingsExportedEvent),
    });
  
    await sqsClient.send(command);
}
