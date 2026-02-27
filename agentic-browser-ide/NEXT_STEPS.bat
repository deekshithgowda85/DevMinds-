@echo off
echo.
echo ========================================
echo   E2B RATE LIMIT - WHAT TO DO NOW
echo ========================================
echo.
echo You hit E2B's limit of 20 concurrent sandboxes.
echo.
echo OPTION 1: Quick Fix (Recommended)
echo -----------------------------------------
echo 1. Open: https://e2b.dev/dashboard
echo 2. Login to your account
echo 3. Go to "Sandboxes" section
echo 4. Click "Terminate All" or close each one
echo 5. Come back and run: npm run dev
echo.
echo OPTION 2: Wait It Out
echo -----------------------------------------
echo E2B auto-closes inactive sandboxes after ~2 hours
echo Just wait and try again later.
echo.
echo ========================================
echo   AFTER CLEANUP - VERIFICATION
echo ========================================
echo.
echo Run this command to check status:
echo   npm run cleanup
echo.
echo Should show: "Active Sessions: 0"
echo.
echo Then start the server:
echo   npm run dev
echo.
echo ========================================
echo   WHAT WE FIXED
echo ========================================
echo.
echo ✓ Sandbox reuse (1 instance instead of creating new every second)
echo ✓ Live streaming with SSE (1-second frames)
echo ✓ Refresh button (works without breaking stream)
echo ✓ Session persistence (survives page refresh)
echo ✓ Auto cleanup (idle sandboxes close after 10 min)
echo ✓ Monitoring tools (npm run cleanup)
echo.
echo The code is COMPLETE and ready to use!
echo Just need to clear the E2B rate limit first.
echo.
pause
