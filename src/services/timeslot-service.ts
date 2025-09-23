import { TimeSlotEntity } from "../entities/timeslot-entity";
import { TimeSlotRepository } from "../repositories/timeslot-repository";

export class TimeSlotService {
    private readonly timeSlotRepository: TimeSlotRepository;

    constructor(timeSlotRepository: TimeSlotRepository) {
        this.timeSlotRepository = timeSlotRepository;
    }

    async getTimeslotsByMentor(mentorId: string): Promise<TimeSlotEntity[]> {
        return await this.timeSlotRepository.getUpcomingTimeslotsByMentor(mentorId);
    }

    async getTimeSlotById(timeSlotId: string): Promise<TimeSlotEntity|null> {
        return await this.timeSlotRepository.getTimeSlotById(timeSlotId);
    }

    async markTimeslotAsBooked(timeslot: TimeSlotEntity): Promise<void> {
        timeslot.isBooked = true;
        await this.updateTimeslot(timeslot);
    }

    async markTimeslotAsNonBooked(timeslot: TimeSlotEntity): Promise<void> {
        timeslot.isBooked = false;
        await this.updateTimeslot(timeslot);
    }

    async updateTimeslot(timeslot: TimeSlotEntity): Promise<TimeSlotEntity> {
        await this.timeSlotRepository.updateTimeSlot(timeslot); 
        return timeslot;
    }

    async deleteTimeSlotById(timeSlotId: string): Promise<void> {
        await this.timeSlotRepository.deleteTimeslotById(timeSlotId);
    }

    async getOverlappingTimeSlotsByMentor(mentorId: string, startDate: Date, endDate: Date): Promise<TimeSlotEntity[]> {
        return await this.timeSlotRepository.getOverlappingTimeSlotsByMentor(mentorId, startDate, endDate);
    }

    async createTimeslot(timeslot: TimeSlotEntity): Promise<TimeSlotEntity> {
        await this.timeSlotRepository.createTimeslot(timeslot);
        return timeslot;
    }

}
