import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TimeSlotService } from "../services/timeslot-service";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { TimeSlotEntity, TimeSlotSchema } from "../entities/timeslot-entity";

const dynamoDBClient = new DynamoDBClient({ 
    region: process.env.REGION 
});

const timeSlotService = new TimeSlotService(
    new TimeSlotRepository(
        process.env.TIMESLOTS_TABLE_NAME || '',
        dynamoDBClient,
    ), 
);

export const main = async (event: any) => {
    return await handleUpdateTimeslot(event, { timeSlotService });
}

export const handleUpdateTimeslot = async(event: any, dependencies: { timeSlotService: TimeSlotService; }) => {
    try {
        const mentorId = event.pathParameters?.mentorId;
        const timeslotId = event.pathParameters?.timeslotId;
        if(!mentorId || !timeslotId) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'mentorId and timeslotId are required in the path parameters',
                }),
            };
        }
        
        const timeslotToUpdate: TimeSlotEntity|null = await dependencies.timeSlotService.getTimeSlotById(timeslotId);
        if(!timeslotToUpdate) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid timeslot',
                }),
            };
        }
        if(mentorId !== timeslotToUpdate.mentorId) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'Access denied. Cannot update timeslot owned by another mentor',
                }),
            };
        }
        const body = JSON.parse(event.body);
        body.id = timeslotId;
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
        const updatedTimeslot = await dependencies.timeSlotService.updateTimeslot(timeSlot);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Timeslot was successfully updated',
                timeslot: JSON.stringify(updatedTimeslot),
            }),
        };
    } catch (error) {
       return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
       };
    }
}
