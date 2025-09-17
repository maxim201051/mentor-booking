import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { MentorEntity } from "../entities/mentor-entity";
import { MentorRepository } from "../repositories/mentor-repository";
import { MentorService } from "../services/mentor-service";
import { TimeSlotService } from "../services/timeslot-service";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { BookingService } from "../services/booking-service";
import { BookingRepository } from "../repositories/booking-repository";

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

export const main = async (event: any) => {
    return await handle(event, { mentorService, bookingService })
}

export const handle = async (event: any, dependencies: { mentorService: MentorService; bookingService: BookingService; }) => {
    try {
        const queryParams = event.queryStringParameters || {};
        const mentorId = event.pathParameters?.mentorId;
        if(!mentorId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'mentorId is required in the path parameters',
                }),
            };
        }
        const mentor: MentorEntity|null = await dependencies.mentorService.getMentorById(mentorId);
        if(!mentor) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Mentor with such id does not exits',
                }),
            };
        }

        const bookings = await dependencies.bookingService.getBookingsByMentorIdWithFilters(mentorId, queryParams);

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