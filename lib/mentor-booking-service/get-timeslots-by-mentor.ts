import { MentorService } from "./services/mentor-service";
import { TimeSlotService } from "./services/timeslot-service"

const timeSlotService = new TimeSlotService(
    process.env.TIMESLOTS_TABLE_NAME || '',
    process.env.REGION 
);

const mentorService = new MentorService(
    process.env.MENTORS_TABLE_NAME || '',
    process.env.REGION 
);

export const main = async (event: any) => {
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
        const mentorExists = await mentorService.isMentorExist(mentorId);
        if(!mentorExists) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                error: 'Mentor with such id does not exits',
                }),
            };
        }
        const mentors = await timeSlotService.getTimeslotsByMentor(mentorId);
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