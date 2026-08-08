require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());


// =========================
// TEST ROUTE
// =========================

app.get("/", (req, res) => {
    res.send("Ascend server is running!");
});


// =========================
// GENERATE DAILY LADDER TASKS
// =========================

app.post("/generate-daily-tasks", async (req, res) => {

    try {

        const {
            goals,
            timeLimit,
            timeOfDay,
            focus,
            level,
            ladderDay,
            previousTasks
        } = req.body;


        console.log("=== Received Daily Ladder Data ===");
        console.log(req.body);


        // =========================
        // CHECK API KEY
        // =========================

        if (!process.env.GROQ_API_KEY) {

            return res.status(500).json({
                error: "GROQ_API_KEY is missing from .env"
            });

        }


        // =========================
        // DETERMINE DIFFICULTY
        // =========================

        let difficulty;

        if (ladderDay <= 3) {
            difficulty = "Beginner";
        } 
        else if (ladderDay <= 7) {
            difficulty = "Beginner+";
        } 
        else if (ladderDay <= 14) {
            difficulty = "Intermediate";
        } 
        else if (ladderDay <= 30) {
            difficulty = "Intermediate+";
        } 
        else {
            difficulty = "Advanced";
        }


        // =========================
        // AI PROMPT
        // =========================

        const prompt = `

You are the AI coach for an app called Ascend.

Ascend is an endless self-improvement ladder.

The user receives EXACTLY 5 tasks every day.

The user completes those 5 tasks and then progresses to the next ladder day.

Generate tasks for ONLY ONE DAY.

USER INFORMATION:

Goals:
${JSON.stringify(goals)}

Available time:
${timeLimit}

Available time of day:
${timeOfDay}

Main focus:
${focus}

Experience level:
${level}

Current ladder day:
${ladderDay}

Current difficulty:
${difficulty}


PREVIOUS TASKS:

${JSON.stringify(previousTasks || [])}


IMPORTANT RULES:

1. Generate EXACTLY 5 tasks.

2. Generate tasks ONLY for ladder day ${ladderDay}.

3. Do NOT generate tasks for other days.

4. Every task must directly help the user's goals.

5. Tasks should strongly relate to the user's main focus.

6. Tasks must be realistic for the user's available time.

7. Tasks must match the user's experience level.

8. Difficulty should gradually increase as the ladder day increases.

9. Do NOT repeat previous tasks.

10. Do not make tasks unnecessarily difficult.

11. Tasks should be specific and actionable.

12. The 5 tasks should be different from each other.

13. The user should be able to realistically complete all 5 tasks in one day.

14. The ladder has NO END.

15. Do not mention that the ladder eventually ends.

Return ONLY valid JSON.

Use EXACTLY this structure:

{
    "ladderDay": ${ladderDay},
    "difficulty": "${difficulty}",
    "tasks": [
        "Task 1",
        "Task 2",
        "Task 3",
        "Task 4",
        "Task 5"
    ]
}

`;


        // =========================
        // CALL GROQ
        // =========================

        const response = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${process.env.GROQ_API_KEY}`
                },

                body: JSON.stringify({

                    model: "llama-3.1-8b-instant",

                    messages: [

                        {
                            role: "system",
                            content:
                                "You are a helpful AI self-improvement coach. Always return valid JSON when requested."
                        },

                        {
                            role: "user",
                            content: prompt
                        }

                    ],

                    temperature: 0.7,

                    response_format: {
                        type: "json_object"
                    }

                })
            }
        );


        // =========================
        // HANDLE GROQ ERROR
        // =========================

        if (!response.ok) {

            const errorText = await response.text();

            console.error("Groq error:", errorText);

            return res.status(500).json({
                error: "Groq API request failed",
                details: errorText
            });

        }


        // =========================
        // READ AI RESPONSE
        // =========================

        const data = await response.json();

        const aiResponse =
            data.choices[0].message.content;

        const dailyTasks =
            JSON.parse(aiResponse);


        // =========================
        // VERIFY 5 TASKS
        // =========================

        if (
            !dailyTasks.tasks ||
            !Array.isArray(dailyTasks.tasks) ||
            dailyTasks.tasks.length !== 5
        ) {

            console.error(
                "AI did not return exactly 5 tasks:",
                dailyTasks
            );

            return res.status(500).json({
                error: "AI did not generate exactly 5 tasks"
            });

        }


        // =========================
        // SEND TO FRONTEND
        // =========================

        console.log("=== Generated Daily Tasks ===");
        console.log(dailyTasks);


        res.json(dailyTasks);


    } catch (error) {

        console.error("Server error:", error);

        res.status(500).json({
            error: "Failed to generate daily tasks",
            details: error.message
        });

    }

});


// =========================
// START SERVER
// =========================

app.listen(3000, () => {

    console.log(
        "Ascend server running on http://localhost:3000"
    );

});