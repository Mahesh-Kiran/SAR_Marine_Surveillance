from fastapi import FastAPI
from routes import dzi_routes, detection_routes

app = FastAPI()

# Register routes
app.include_router(dzi_routes.router)
app.include_router(detection_routes.router)
