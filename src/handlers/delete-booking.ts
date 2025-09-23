import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { BookingService } from "../services/booking-service";
import { TimeSlotService } from "../services/timeslot-service";
import { BookingEntity } from "../entities/booking-entity";
import { BookingRepository } from "../repositories/booking-repository";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { MentorEntity } from "../entities/mentor-entity";
import { StudentEntity } from "../entities/student-entity";
import { TimeSlotEntity } from "../entities/timeslot-entity";
import { MentorRepository } from "../repositories/mentor-repository";
import { StudentRepository } from "../repositories/student-repository";
import { MentorService } from "../services/mentor-service";
import { StudentService } from "../services/student-service";
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

const bookingService = new BookingService(
    new BookingRepository(
        process.env.BOOKINGS_TABLE_NAME || '',
        dynamoDBClient,
    ),
    timeSlotService,
);

const studentService = new StudentService(
    new StudentRepository(
        process.env.STUDENTS_TABLE_NAME || '',
        dynamoDBClient,
    )
);

const sqsClient = new SQSClient({ 
    region: process.env.REGION 
});

export const main = async (event: any) => {
    return await handleDeleteBooking(event, { mentorService, timeSlotService, studentService, bookingService })
}

export const handleDeleteBooking = async(event: any, dependencies: { mentorService: MentorService; timeSlotService: TimeSlotService; studentService: StudentService; bookingService: BookingService}) => {
    try {
        const bookingId = event.pathParameters?.bookingId;
        const studentId = event.headers?.auth;
        if(!bookingId) {
            return {
              statusCode: 400,
              body: JSON.stringify({
                error: 'bookingId is required in the path parameters',
              }),
            };
        };
        if(!studentId) {
            return {
              statusCode: 401,
              body: JSON.stringify({
                error: 'auth is required in the query parameters',
              }),
            };
        };

        const booking: BookingEntity|null = await dependencies.bookingService.getBookingById(bookingId);
        if(!booking) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid booking',
                }),
            };
        }
        if(studentId !== booking.studentId) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'Access denied. Cannot delete booking owned by another student',
                }),
            };
        }

        const mentor: MentorEntity|null = await dependencies.mentorService.getMentorById(booking.mentorId);
        if(!mentor) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid mentor',
                }),
            };
        }
        const timeSlot: TimeSlotEntity|null = await dependencies.timeSlotService.getTimeSlotById(booking.timeslotId);
        if (!timeSlot) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid timeslot',
                }),
            };
        }

        const student: StudentEntity|null = await dependencies.studentService.getStudentById(booking.studentId);
        if(!student) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid student',
                }),
            };
        }

        await dependencies.bookingService.deleteBookingById(bookingId);
        await dependencies.timeSlotService.markTimeslotAsNonBooked(timeSlot);
		await sendBookingDeletedEvent(booking, student, mentor, timeSlot);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Booking was successfully deleted',
            }),
        };
    } catch (error) {
       return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
       };
    }
}

const sendBookingDeletedEvent = async(booking: BookingEntity, student: StudentEntity, mentor: MentorEntity, timeSlot: TimeSlotEntity): Promise<void> => {
    const bookingEvent = {
        type: "booking.cancelled",
        bookingId: booking.id,
        studentEmail: student.email,
        mentorEmail: mentor.email,
        studentFullName: student.fullName,
        mentorFullName: mentor.fullName,
        startDate: timeSlot.startDate,
        endDate: timeSlot.endDate,
    };

    const command = new SendMessageCommand({
        QueueUrl: process.env.NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(bookingEvent),
    });
  
    await sqsClient.send(command);
}