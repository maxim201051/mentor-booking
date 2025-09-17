import { EmailNotificationService } from "../services/email-notification-service";
import { MentorService } from "../services/mentor-service";
import { TimeSlotService } from "../services/timeslot-service";
import { StudentService } from "../services/student-service";
import { StudentRepository } from "../repositories/student-repository";
import { MentorRepository } from "../repositories/mentor-repository";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { BookingNotificationEntity, BookingNotificationEntitySchema } from "../entities/booking-notification-entity";
import { SESClient } from "@aws-sdk/client-ses";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const dynamoDBClient = new DynamoDBClient({ 
    region: process.env.REGION 
});

const mentorService = new MentorService(
    new MentorRepository(
        process.env.MENTORS_TABLE_NAME || '',
        dynamoDBClient,
    ),
);
const timeSlotService = new TimeSlotService(
    new TimeSlotRepository(
        process.env.TIMESLOTS_TABLE_NAME || '',
        dynamoDBClient,
    ), 
);

const studentService = new StudentService(
    new StudentRepository(
        process.env.STUDENTS_TABLE_NAME || '',
        dynamoDBClient,
    ),
)

const emailNotificationService = new EmailNotificationService(
    new SESClient({ 
        region: process.env.REGION 
    }),
)

export const main = async (event: any) => {
    try {
        for (const record of event.Records) {
            const bookingEvent: BookingNotificationEntity = BookingNotificationEntitySchema.parse(JSON.parse(record.body));
            if (bookingEvent.type !== "booking.created" && bookingEvent.type !== "booking.cancelled") {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        error: 'Unexpected event type',
                    }),
                };
            }
            emailNotificationService.notifyAboutBooking(bookingEvent);
        }
    
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Notifications processed" }),
        };
    } catch (error: any) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }), //"Internal Server Error"
        };
    }
}