# Troubleshooting Guide

## Common Issues and Solutions

### Backend Issues

#### Issue: "ModuleNotFoundError: No module named 'backend'"
**Solution**: The backend uses relative imports. Make sure you're running from the `/backend` directory:
```bash
cd backend
python -m uvicorn main:app --reload
```

#### Issue: "FileNotFoundError: config/service-account.json"
**Solution**: 
1. Download your Google Cloud Service Account JSON from Google Cloud Console
2. Place it in the `config/` directory as `service-account.json`
3. Ensure the path in `.env` is correct: `GOOGLE_SERVICE_ACCOUNT_JSON=./config/service-account.json`

#### Issue: "Invalid credentials" when accessing Google Sheets
**Solution**:
1. Verify your service account has access to the Google Sheet
2. Share the sheet with the service account email (found in the JSON file)
3. Enable Google Sheets API and Google Docs API in your Google Cloud project

#### Issue: "Jira authentication failed"
**Solution**:
1. Generate a new API token from https://id.atlassian.com/manage-profile/security/api-tokens
2. Use your Atlassian account email (not username)
3. Update `.env` with the correct `JIRA_EMAIL` and `JIRA_API_TOKEN`

#### Issue: "Anthropic API error"
**Solution**:
1. Verify your Claude API key is correct
2. Check you have sufficient credits/quota
3. Ensure you're using a valid model name (claude-sonnet-4-20250514)

### Frontend Issues

#### Issue: "Cannot connect to backend"
**Solution**:
1. Verify backend is running on port 8000
2. Check CORS settings in `backend/main.py`
3. If using Docker, ensure networks are properly configured

#### Issue: "npm install fails"
**Solution**:
1. Clear npm cache: `npm cache clean --force`
2. Delete `node_modules` and `package-lock.json`
3. Run `npm install` again
4. Ensure you're using Node.js 18 or higher

#### Issue: "Build fails with TypeScript errors"
**Solution**:
1. Check for syntax errors in `.tsx` files
2. Ensure all imports are correct
3. Run `npm run build` to see detailed errors

### Docker Issues

#### Issue: "Port already in use"
**Solution**:
```bash
# Find and stop the process using the port
lsof -ti:8000 | xargs kill -9  # for backend
lsof -ti:3000 | xargs kill -9  # for frontend
```

#### Issue: "Docker build fails"
**Solution**:
1. Ensure Docker has enough memory allocated (at least 4GB)
2. Try building with no cache: `docker-compose build --no-cache`
3. Check Docker logs: `docker-compose logs`

#### Issue: "Services can't communicate"
**Solution**:
1. Verify all services are in the same Docker network
2. Check `docker-compose.yml` network configuration
3. Use service names (not localhost) for inter-service communication

### Data Issues

#### Issue: "Workstreams not loading"
**Solution**:
1. Verify the Google Sheet ID in `.env` is correct
2. Check the sheet has the expected column structure
3. Ensure workstream headers match the expected format

#### Issue: "AI updates are generic/unhelpful"
**Solution**:
1. Ensure Notes documents contain relevant, detailed information
2. Check that the correct doc is linked in column Q
3. The AI only extracts what's in the document - add more context if needed

#### Issue: "Updates not posting to Jira"
**Solution**:
1. Verify the Jira ticket exists and you have permissions
2. Check Jira ticket key format (e.g., "PROJ-123")
3. Ensure your Jira account has comment permissions

## Performance Issues

### Slow AI generation
- Claude API can take 5-15 seconds per milestone
- Large documents (>50K chars) take longer
- Consider using "Preview" for individual milestones instead of "Run All"

### Memory issues
- Each document is cached to avoid redundant API calls
- Cache is cleared when the service restarts
- For large sheets (100+ milestones), consider processing in batches

## Debugging Tips

### Enable verbose logging
Add to backend:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

### Test individual components
```bash
# Test Google Sheets connection
cd backend
source venv/bin/activate
python -c "from services.sheet_reader import get_sheet_reader; print(get_sheet_reader().parse_sheet())"

# Test Jira connection
python -c "from services.jira_client import get_jira_client; print(get_jira_client().client.myself())"
```

### Check API responses
Use the interactive API docs at `http://localhost:8000/docs` to test endpoints directly.

## Getting Help

If you encounter issues not covered here:
1. Check the application logs: `docker-compose logs -f`
2. Review the FastAPI logs for backend errors
3. Check browser console for frontend errors
4. Ensure all environment variables are set correctly
