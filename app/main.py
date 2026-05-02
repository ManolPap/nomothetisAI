from fastapi import FastAPI

app = FastAPI(description="nomothetisAI REST API")

@app.get("/")
async def root():
    return {"message": "Hello World"}