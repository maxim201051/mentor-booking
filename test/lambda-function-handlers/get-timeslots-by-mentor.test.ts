import { MentorService } from "../../src/services/mentor-service";
import { TimeSlotService } from "../../src/services/timeslot-service";
import { TimeSlotEntity } from "../../src/entities/timeslot-entity";
import { MentorEntity } from "../../src/entities/mentor-entity";
import { handleGetTimeslotsByMentor } from "../../src/handlers/get-timeslots-by-mentor";

describe("handleGetTimeslotsByMentor Tests", () => {
    let mockMentorService: jest.Mocked<MentorService>;
    let mockTimeSlotService: jest.Mocked<TimeSlotService>;

    beforeEach(() => {
        mockMentorService = {
            getMentorById: jest.fn(), 
        } as unknown as jest.Mocked<MentorService>;

        mockTimeSlotService = {
            getTimeslotsByMentor: jest.fn(),
        } as unknown as jest.Mocked<TimeSlotService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mentor: MentorEntity = {
        id: "mentor-1",
        email: "mentor@example.com",
        fullName: "John Mentor",
        skills: ["JavaScript", "AWS"],
        experience: 5,
    };

    const timeSlots: TimeSlotEntity[] = [
        {
            id: "timeslot-1",
            mentorId: "mentor-1",
            startDate: new Date("2023-12-01T10:00:00Z"),
            endDate: new Date("2023-12-01T11:00:00Z"),
            isBooked: false,
        },
        {
            id: "timeslot-2",
            mentorId: "mentor-1",
            startDate: new Date("2023-12-02T10:00:00Z"),
            endDate: new Date("2023-12-02T11:00:00Z"),
            isBooked: true,
        },
    ];

    const eventWithValidMentorId = {
        pathParameters: { mentorId: "mentor-1" },
    };

    test("handleGetTimeslotsByMentor should retrieve timeslots for a valid mentor", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getTimeslotsByMentor.mockResolvedValueOnce(timeSlots);

        const result = await handleGetTimeslotsByMentor(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify(timeSlots),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockTimeSlotService.getTimeslotsByMentor).toHaveBeenCalledWith("mentor-1");
    });

    test("handleGetTimeslotsByMentor should return error if 'mentorId' is missing", async () => {
        const event = { pathParameters: null };

        const result = await handleGetTimeslotsByMentor(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "mentorId is required in the path parameters",
            }),
        });

        expect(mockMentorService.getMentorById).not.toHaveBeenCalled();
        expect(mockTimeSlotService.getTimeslotsByMentor).not.toHaveBeenCalled();
    });

    test("handleGetTimeslotsByMentor should return error if mentor does not exist", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(null);

        const result = await handleGetTimeslotsByMentor(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Mentor with such id does not exits",
            }),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockTimeSlotService.getTimeslotsByMentor).not.toHaveBeenCalled();
    });

    test("handleGetTimeslotsByMentor should return 500 for unexpected errors", async () => {
        mockMentorService.getMentorById.mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleGetTimeslotsByMentor(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockTimeSlotService.getTimeslotsByMentor).not.toHaveBeenCalled();
    });
});