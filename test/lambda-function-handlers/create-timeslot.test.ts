import { MentorService } from "../../src/services/mentor-service";
import { MentorEntity } from "../../src/entities/mentor-entity";
import { TimeSlotService } from "../../src/services/timeslot-service";
import { TimeSlotEntity } from "../../src/entities/timeslot-entity";
import { handleCreateTimeSlot } from "../../src/handlers/create-timeslot";

describe("handleCreateTimeSlot Tests", () => {
    let mockMentorService: jest.Mocked<MentorService>;
    let mockTimeSlotService: jest.Mocked<TimeSlotService>;

    beforeEach(() => {
        mockMentorService = {
            getMentorById: jest.fn(),
        } as unknown as jest.Mocked<MentorService>;

        mockTimeSlotService = {
            getOverlappingTimeSlotsByMentor: jest.fn(),
            createTimeslot: jest.fn(),
        } as unknown as jest.Mocked<TimeSlotService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mentor: MentorEntity = {
        id: "mentor-1",
        email: "mentor@example.com",
        fullName: "John Mentor",
        skills: ["JavaScript", "AWS", "React"],
        experience: 5,
    };

    const validTimeSlot: TimeSlotEntity = {
        id: "timeslot-1",
        mentorId: "mentor-1",
        startDate: new Date("2025-12-01T10:00:00Z"),
        endDate: new Date("2025-12-01T11:00:00Z"),
        isBooked: false,
    };

    const eventWithValidMentorId = {
        pathParameters: { mentorId: "mentor-1" },
        body: JSON.stringify({
            startDate: validTimeSlot.startDate,
            endDate: validTimeSlot.endDate,
        }),
    };

    test("handleCreateTimeSlot should create timeslot successfully", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getOverlappingTimeSlotsByMentor.mockResolvedValueOnce([]);
        mockTimeSlotService.createTimeslot.mockResolvedValueOnce(validTimeSlot);

        const result = await handleCreateTimeSlot(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 201,
            body: JSON.stringify({
                message: "Timeslot was successfully created",
                timeslot: JSON.stringify(validTimeSlot),
            }),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockTimeSlotService.getOverlappingTimeSlotsByMentor).toHaveBeenCalledWith(
            "mentor-1",
            validTimeSlot.startDate,
            validTimeSlot.endDate
        );
        expect(mockTimeSlotService.createTimeslot).toHaveBeenCalledWith({
            ...validTimeSlot,
            id: expect.any(String), 
        });
    });

    test("handleCreateTimeSlot should return error if mentorId is missing in pathParameters", async () => {
        const event = { ...eventWithValidMentorId, pathParameters: null };

        const result = await handleCreateTimeSlot(event, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "mentorId is required in the path parameters",
            }),
        });
    });

    test("handleCreateTimeSlot should return error if mentor does not exist", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(null);

        const result = await handleCreateTimeSlot(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Mentor with such id does not exits",
            }),
        });
    });

    test("handleCreateTimeSlot should return error if timeslot is in the past", async () => {
        const eventWithPastTimeSlot = {
            ...eventWithValidMentorId,
            body: JSON.stringify({
                startDate: new Date("2023-01-01T10:00:00Z"),
                endDate: new Date("2023-01-01T11:00:00Z"),
            }),
        };

        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);

        const result = await handleCreateTimeSlot(eventWithPastTimeSlot, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Timeslot should be in the future",
            }),
        });
    });

    test("handleCreateTimeSlot should return error for overlapping timeslot", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockTimeSlotService.getOverlappingTimeSlotsByMentor.mockResolvedValueOnce([validTimeSlot]);

        const result = await handleCreateTimeSlot(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Timeslot should not overlap exesting mentors timeslots",
            }),
        });

        expect(mockTimeSlotService.getOverlappingTimeSlotsByMentor).toHaveBeenCalledWith(
            "mentor-1",
            validTimeSlot.startDate,
            validTimeSlot.endDate
        );
    });

    test("handleCreateTimeSlot should return 500 for unexpected errors", async () => {
        mockMentorService.getMentorById.mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleCreateTimeSlot(eventWithValidMentorId, {
            mentorService: mockMentorService,
            timeSlotService: mockTimeSlotService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });
    });
});