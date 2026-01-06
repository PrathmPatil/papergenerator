import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Papergenerator API",
      version: "1.0.0",
      description: "API documentation for Questions, Templates, Papers",
    },
    servers: [{ url: "http://localhost:5000" }]
  },

  // ⭐ THIS IS CORRECT FOR YOUR STRUCTURE
  apis: [path.join(__dirname, "./routes/*.js")],
};

export const swaggerSpec = swaggerJsdoc(options);

export const swaggerDocs = (app) => {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
