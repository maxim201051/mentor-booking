import { MentorEntity } from "../../lib/mentor-booking-service/entities/mentor-entity";

export const mentors: MentorEntity[] = [
    {
      id: "mentor-1",
      name: "John Doe",
      email: "john.doe@example.com",
      skills: ["JavaScript", "AWS", "React"],
      experience: 5,
    },
    {
      id: "mentor-2",
      name: "Jane Smith",
      email: "jane.smith@example.com",
      skills: ["Python", "Machine Learning", "Django"],
      experience: 8,
    },
    {
      id: "mentor-3",
      name: "Alice Johnson",
      email: "alice.johnson@example.com",
      skills: ["Java", "Spring Boot", "Microservices"],
      experience: 10,
    },
  ];