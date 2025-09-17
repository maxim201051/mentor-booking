import { StudentEntity } from "../entities/student-entity";
import { StudentRepository } from "../repositories/student-repository";

export class StudentService {
    private readonly studentRepository: StudentRepository;

    constructor(studentRepository: StudentRepository) {
        this.studentRepository = studentRepository;
    }

    async getStudentById(studentId: string): Promise<StudentEntity|null> {
        return await this.studentRepository.getStudentById(studentId);
    }

}