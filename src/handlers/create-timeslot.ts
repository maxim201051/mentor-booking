import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { MentorService } from "../services/mentor-service";
import { MentorRepository } from "../repositories/mentor-repository";
import { MentorEntity } from "../entities/mentor-entity";
import { TimeSlotEntity, TimeSlotSchema } from "../entities/timeslot-entity";
import { TimeSlotService } from "../services/timeslot-service";
import { TimeSlotRepository } from "../repositories/timeslot-repository";

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

export const main = async (event: any) => {
    return await handleCreateTimeSlot(event, { mentorService, timeSlotService })
}

export const handleCreateTimeSlot = async (event: any, dependencies: { mentorService: MentorService; timeSlotService: TimeSlotService }) => {
    try {
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
        const body = JSON.parse(event.body);
        body.mentorId = mentorId;
        const timeSlot: TimeSlotEntity = TimeSlotSchema.parse(body);
        if(timeSlot.startDate <= new Date()) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Timeslot should be in the future',
                }),
            };
        }
        const overlappintTimeslots: TimeSlotEntity[] = await timeSlotService.getOverlappingTimeSlotsByMentor(mentorId, timeSlot.startDate, timeSlot.endDate);
        if(overlappintTimeslots.length > 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Timeslot should not overlap exesting mentors timeslots',
                }),
            };
        }
        const createdTimeslot = await timeSlotService.createTimeslot(timeSlot);
        return {
            statusCode: 201,
            body: JSON.stringify({
                message: 'Timeslot was successfully created',
                timeslot: JSON.stringify(createdTimeslot),
            }),
        }
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
}