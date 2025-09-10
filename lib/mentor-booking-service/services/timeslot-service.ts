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

    async getTimeSlotById(timeSlotId: string): Promise<TimeSlotEntity|null> {
        return await this.timeSlotRepository.getTimeSlotById(timeSlotId);
    }

    async markTimeslotAsBooked(timeSlotId: string): Promise<void> {
        await this.timeSlotRepository.updateTimeSlotIsBookedStatus(timeSlotId, true);
    }

    async markTimeslotAsNonBooked(timeSlotId: string): Promise<void> {
        await this.timeSlotRepository.updateTimeSlotIsBookedStatus(timeSlotId, false);
    }

}
