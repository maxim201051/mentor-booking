import { TimeSlotEntity } from "../entities/timeslot-entity";
import { TimeSlotRepository } from "../repositories/timeslot-repository";

export class TimeSlotService {
    private readonly timeSlotRepository: TimeSlotRepository;

    constructor(timeSlotsTableName: string, region?: string) {
        this.timeSlotRepository = new TimeSlotRepository(timeSlotsTableName, region);
    }

    async getTimeslotsByMentor(mentorId: string): Promise<TimeSlotEntity[]> {
        return await this.timeSlotRepository.getTimeslotsByMentor(mentorId);
    }

    async markTimeslotAsNonBooked(timeSlotId: string): Promise<void> {
        await this.timeSlotRepository.updateTimeSlotIsBookedStatus(timeSlotId, false);
    }

}
