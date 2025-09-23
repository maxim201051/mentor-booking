import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { TimeSlotService } from "../services/timeslot-service";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { TimeSlotEntity } from "../entities/timeslot-entity";

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
    return await handleDeleteTimeslot(event, { timeSlotService });
}

export const handleDeleteTimeslot = async (event: any, dependencies: { timeSlotService: TimeSlotService; }) => {
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

        const timeslot: TimeSlotEntity|null = await dependencies.timeSlotService.getTimeSlotById(timeslotId);
        if(!timeslot) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid timeslot',
                }),
            };
        }
        if(mentorId !== timeslot.mentorId) {
            return {
                statusCode: 403,
                body: JSON.stringify({
                    error: 'Access denied. Cannot delete timeslot owned by another mentor',
                }),
            };
        }

        await dependencies.timeSlotService.deleteTimeSlotById(timeslotId);
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Timeslot was successfully deleted',
            }),
        };
    } catch (error) {
       return {
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
       };
    }
}
