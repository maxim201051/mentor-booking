import { main } from "../../lib/mentor-booking-service/get-mentors-list";
import { MentorService } from "../../lib/mentor-booking-service/services/mentor-service";

jest.mock("../../lib/mentor-booking-service/services/mentor-service");

describe("get-mentors-list handler", () => {
  let mockQueryMentorsWithFilters: jest.Mock;

  beforeEach(() => {
    mockQueryMentorsWithFilters = jest.fn();
    (MentorService as jest.Mock).mockImplementation(() => ({
      queryMentorsWithFilters: mockQueryMentorsWithFilters,
    }));
  });

  test("should return mentors when query parameters are empty", async () => {
    mockQueryMentorsWithFilters.mockResolvedValue([
      {
        id: "mentor-1",
        fullName: "John Doe",
        email: "john.doe@example.com",
        skills: ["JavaScript"],
        experience: 5,
      },
    ]);

    const response = await main({ queryStringParameters: {} });

    expect(mockQueryMentorsWithFilters).toHaveBeenCalledWith({}); 
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify([
        {
          id: "mentor-1",
          fullName: "John Doe",
          email: "john.doe@example.com",
          skills: ["JavaScript"],
          experience: 5,
        },
      ]),
    });
  });

  test("should return mentors with filters", async () => {
    mockQueryMentorsWithFilters.mockResolvedValue([
      {
        id: "mentor-2",
        fullName: "Jane Smith",
        email: "jane.smith@example.com",
        skills: ["Python"],
        experience: 7,
      },
    ]);

    const response = await main({ queryStringParameters: { fullName: "Jane", experience: "7" } });

    expect(mockQueryMentorsWithFilters).toHaveBeenCalledWith({ fullName: "Jane", experience: "7" }); 
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify([
        {
          id: "mentor-2",
          fullName: "Jane Smith",
          email: "jane.smith@example.com",
          skills: ["Python"],
          experience: 7,
        },
      ]),
    });
  });

  test("should handle errors", async () => {
    mockQueryMentorsWithFilters.mockRejectedValue(new Error("Error"));

    const response = await main({ queryStringParameters: {} });

    expect(mockQueryMentorsWithFilters).toHaveBeenCalledWith({}); 
    expect(response).toEqual({
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });
});