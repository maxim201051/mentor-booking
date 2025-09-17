export const dynamodbUtils = {
    createMentorSearchParams(filters: Map<string, unknown>) {
        let conditions: string[] = [];
        let expressionAttributes: Record<string, any> = {};
        if(filters.has("fullName")) {
            conditions.push("fullName = :fullName")
            expressionAttributes[":fullName"] = {S: filters.get("fullName")}
        }
        if(filters.has("minimalExperience")) {
            conditions.push("experience >= :minimalExperience")
            expressionAttributes[":minimalExperience"] = {N: filters.get("minimalExperience")}
        }
        if(filters.has("skill")) {
            conditions.push("contains(skills, :skill)")
            expressionAttributes[":skill"] = {S: filters.get("skill")}
        }
        return {
            FilterExpression: conditions.length > 0 ? conditions.join("AND") : undefined,
            ExpressionAttributeValues: conditions.length > 0 ? expressionAttributes : undefined
        };
    },
};