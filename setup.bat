@echo off
echo ============================================
echo  AI Due Diligence Copilot - Quick Setup
echo ============================================
echo.

IF NOT EXIST "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo Created backend\.env from template.
    echo.
    echo Please edit backend\.env and add your API keys:
    echo   GEMINI_API_KEY=your_gemini_api_key_here
    echo   OPENAI_API_KEY=your_openai_api_key_here

    echo.
    notepad "backend\.env"
) ELSE (
    echo backend\.env already exists.
)

echo.
echo --- Setting up Python virtual environment ---
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo.
echo --- Installing frontend dependencies ---
cd frontend
npm install
cd ..

echo.
echo ============================================
echo  Setup complete!
echo.
echo  To start the backend:
echo    cd backend
echo    venv\Scripts\activate
echo    uvicorn main:app --reload --port 8000
echo.
echo  To start the frontend (new terminal):
echo    cd frontend
echo    npm run dev
echo.
echo  Then open: http://localhost:5173
echo ============================================
pause
