import { MentorEntity } from "../entities/mentor-entity";
import { MentorRepository } from "../repositories/mentor-repository";


export class MentorService {
    private readonly mentorRepository: MentorRepository;

    constructor(mentorRepository: MentorRepository) {
        this.mentorRepository = mentorRepository;
    }

    async queryMentorsWithFilters(queryParams: any): Promise<MentorEntity[]> {
		return await this.mentorRepository.queryMentorsWithFilters(queryParams);
    }

    async getMentorById(mentorId: string): Promise<MentorEntity|null> {
        return await this.mentorRepository.getMentorById(mentorId);
    }

    async createMentor(mentor: MentorEntity): Promise<void> {
        await this.mentorRepository.createMentor(mentor);
    }
}