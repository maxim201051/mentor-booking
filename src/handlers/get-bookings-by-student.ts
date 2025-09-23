import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TimeSlotService } from "../services/timeslot-service";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { BookingService } from "../services/booking-service";
import { BookingRepository } from "../repositories/booking-repository";
import { StudentRepository } from "../repositories/student-repository";
import { StudentService } from "../services/student-service";
import { StudentEntity } from "../entities/student-entity";

const dynamoDBClient = new DynamoDBClient({ 
    region: process.env.REGION 
});

const studentService = new StudentService(
    new StudentRepository(
        process.env.STUDENTS_TABLE_NAME || '',
        dynamoDBClient,
    )
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

export const main = async (event: any) => {
    return await handleGetBookingsByStudent(event, { studentService, bookingService })
}

export const handleGetBookingsByStudent = async (event: any, dependencies: { studentService: StudentService; bookingService: BookingService; }) => {
    try {
        const queryParams = event.queryStringParameters || {};
        const studentId = event.headers?.auth;
        if(!studentId) {
            return {
              statusCode: 401,
              body: JSON.stringify({
                error: 'auth header is required',
              }),
            };
        };
        const student: StudentEntity|null = await dependencies.studentService.getStudentById(studentId);
        if(!student) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Student with such id does not exits',
                }),
            };
        }

        const bookings = await dependencies.bookingService.getBookingsByStudentIdWithFilters(studentId, queryParams);

        return {
            statusCode: 200,
            body: JSON.stringify(bookings),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}