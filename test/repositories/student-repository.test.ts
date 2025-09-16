import { StudentRepository } from "../../lib/mentor-booking-service/repositories/student-repository";

jest.mock("@aws-sdk/client-dynamodb", () => {
  const actual = jest.requireActual("@aws-sdk/client-dynamodb");
  return {
    ...actual,
    DynamoDBClient: jest.fn(() => ({
      send: jest.fn(), 
    })),
    GetItemCommand: actual.GetItemCommand,
  };
});

describe("StudentRepository Tests", () => {
  const studentsTableName = "StudentsTable";
  let mockDynamoDBClient: any; 
  let studentRepository: StudentRepository;

  beforeEach(() => {
    mockDynamoDBClient = {
      send: jest.fn(),
    };

    studentRepository = new StudentRepository(studentsTableName, mockDynamoDBClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("getStudentById should return a student when the student exists", async () => {
    const studentId = "student-123";

    const studentResponse = {
      Item: {
        id: { S: studentId },
        firstName: { S: "John" },
        lastName: { S: "Doe" },
        email: { S: "john.doe@example.com" },
      },
    };

    mockDynamoDBClient.send.mockResolvedValueOnce(studentResponse);

    const result = await studentRepository.getStudentById(studentId);

    expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: studentsTableName,
          Key: {
            id: { S: studentId },
          },
        },
      })
    );

    expect(result).toEqual({
      id: studentId,
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
    });
  });

  test("getStudentById should return null when the student does not exist", async () => {
    const studentId = "non-existent-student";

    mockDynamoDBClient.send.mockResolvedValueOnce({});

    const result = await studentRepository.getStudentById(studentId);

    expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: studentsTableName,
          Key: {
            id: { S: studentId },
          },
        },
      })
    );

    expect(result).toBeNull();
  });

  test("getStudentById should throw an error if DynamoDBClient.send fails", async () => {
    const studentId = "student-123";

    const errorMessage = "DynamoDB Error";
    mockDynamoDBClient.send.mockRejectedValueOnce(new Error(errorMessage));

    await expect(studentRepository.getStudentById(studentId)).rejects.toThrow(
      `Failed to get student by ID ${studentId}`
    );

    expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          TableName: studentsTableName,
          Key: {
            id: { S: studentId },
          },
        },
      })
    );
  });
});