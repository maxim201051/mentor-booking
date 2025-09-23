import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { BookingEntity, BookingSchema } from "../entities/booking-entity";
import { TimeSlotEntity } from "../entities/timeslot-entity";
import { BookingService } from "../services/booking-service";
import { MentorService } from "../services/mentor-service";
import { TimeSlotService } from "../services/timeslot-service";
import { MentorEntity } from "../entities/mentor-entity";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { BookingRepository } from "../repositories/booking-repository";
import { MentorRepository } from "../repositories/mentor-repository";
import { StudentEntity } from "../entities/student-entity";
import { StudentService } from "../services/student-service";
import { StudentRepository } from "../repositories/student-repository";
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
    return await handleCreateBooking(event, { mentorService, timeSlotService, studentService, bookingService })
}

export const handleCreateBooking = async(event: any, dependencies: { mentorService: MentorService; timeSlotService: TimeSlotService; studentService: StudentService; bookingService: BookingService}) => {
    try {
        const body = JSON.parse(event.body);
        const booking: BookingEntity = BookingSchema.parse(body);
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
        if (!timeSlot || timeSlot.isBooked || timeSlot.mentorId !== booking.mentorId) {
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
        if(await dependencies.bookingService.isStudentHasOverlappingBookings(booking.studentId, timeSlot.startDate, timeSlot.endDate)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Conflicting booking found for the student during the requested timeslot.',
                }),
              };
        }
        const createdBooking = await dependencies.bookingService.createBooking(booking);
        await dependencies.timeSlotService.markTimeslotAsBooked(timeSlot);
        await sendBookingCreatedEvent(createdBooking, student, mentor, timeSlot);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Booking was successfully created',
                booking: JSON.stringify(createdBooking),
            }),
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}

const sendBookingCreatedEvent = async(booking: BookingEntity, student: StudentEntity, mentor: MentorEntity, timeSlot: TimeSlotEntity): Promise<void> => {
    const bookingEvent = {
        type: "booking.created",
        bookingId: booking.id,
        studentEmail: student.email,
        mentorEmail: mentor.email,
        studentFullName: student.fullName,
        mentorFullName: mentor.fullName,
        startDate: timeSlot.startDate,
        endDate: timeSlot.endDate
    };

    const command = new SendMessageCommand({
        QueueUrl: process.env.NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(bookingEvent),
    });
  
    await sqsClient.send(command);
}