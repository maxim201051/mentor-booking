import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { MentorRepository } from "../repositories/mentor-repository";
import { TimeSlotRepository } from "../repositories/timeslot-repository";
import { MentorService } from "../services/mentor-service";
import { TimeSlotService } from "../services/timeslot-service"

const dynamoDBClient = new DynamoDBClient({ 
    region: process.env.REGION 
});

const timeSlotService = new TimeSlotService(
    new TimeSlotRepository(
        process.env.TIMESLOTS_TABLE_NAME || '',
        dynamoDBClient,
    ), 
);

const mentorService = new MentorService(
    new MentorRepository(
        process.env.MENTORS_TABLE_NAME || '',
        dynamoDBClient,
    ),
);

export const main = async (event: any) => {
    return await handleGetTimeslotsByMentor(event, { mentorService, timeSlotService })
}

export const handleGetTimeslotsByMentor = async (event: any, dependencies: { mentorService: MentorService; timeSlotService: TimeSlotService; }) => {
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
        const mentor = await dependencies.mentorService.getMentorById(mentorId);
        if(!mentor) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                error: 'Mentor with such id does not exits',
                }),
            };
        }
        const mentors = await dependencies.timeSlotService.getTimeslotsByMentor(mentorId);
        return {
            statusCode: 200,
            body: JSON.stringify(mentors),
        };
    } catch (error) {
        console.error('Error in getTimeSlotsByMentor handler:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
}