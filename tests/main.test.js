const app = require('../src/main').app;
const request = require('supertest');

describe("GET /health_check", () => {
    test("Expects a 200 status code", async () => {
        const res = await request(app).get("/health_check");
        expect(res.statusCode).toBe(200);
    })
})