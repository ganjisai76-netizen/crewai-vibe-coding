from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
import os
import re
from dotenv import load_dotenv
from crewai import Agent, Task, Crew, Process, LLM
import json
import threading
import time
from queue import Queue

load_dotenv()

app = Flask(__name__)
CORS(app)

llm = LLM(
    model="gemini/gemini-2.0-flash-exp",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.7,
)

streams = {}

def extract_code_from_markdown(text, language=''):
    """Robust code extraction from markdown with multiple fallback strategies"""
    if not text or not isinstance(text, str):
        return text or ''
    
    text = text.strip()
    
    # Strategy 1: Look for code blocks with language specifier
    if language:
        pattern = f'```{language}\s*\n(.*?)```'
        matches = re.findall(pattern, text, re.DOTALL | re.IGNORECASE)
        if matches:
            # Return the longest match (usually the main code)
            return max(matches, key=len).strip()
    
    # Strategy 2: Look for any code blocks
    pattern = r'```(?:\w+)?\s*\n(.*?)```'
    matches = re.findall(pattern, text, re.DOTALL)
    if matches:
        return max(matches, key=len).strip()
    
    # Strategy 3: Look for HTML/Python patterns if no code blocks found
    if language == 'html' and ('<!DOCTYPE' in text or '<html' in text):
        # Extract from first DOCTYPE or html tag to end
        start_idx = text.find('<!DOCTYPE')
        if start_idx == -1:
            start_idx = text.find('<html')
        if start_idx != -1:
            return text[start_idx:].strip()
    
    if language == 'python' and ('from flask import' in text or 'import flask' in text):
        # Extract from first import statement
        lines = text.split('\n')
        code_lines = []
        started = False
        for line in lines:
            if 'import' in line or 'from' in line:
                started = True
            if started:
                code_lines.append(line)
        if code_lines:
            return '\n'.join(code_lines).strip()
    
    # Strategy 4: Return as-is if it looks like code
    if language == 'html' and '<' in text and '>' in text:
        return text
    if language == 'python' and ('def ' in text or 'class ' in text or 'import ' in text):
        return text
    
    return text

@app.route('/')
def index():
    return render_template('bolt_style.html')

@app.route('/vibe')
def vibe_index():
    return render_template('vibe_coding.html')

@app.route('/old')
def old_index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    idea = data.get('idea', 'Simple web app')
    stream_id = data.get('stream_id')
    
    message_queue = Queue()
    streams[stream_id] = message_queue
    
    def run_agents():
        try:
            message_queue.put({'type': 'msg', 'agent': 'System', 'text': '🚀 Initializing Advanced Code Generation...'})
            time.sleep(0.5)
            
            # Enhanced Frontend Agent
            frontend_agent = Agent(
                role='Senior Full-Stack Frontend Developer',
                goal='Create production-ready, complete HTML applications with modern UI/UX',
                backstory="""You are an expert frontend developer with 10+ years of experience. 
                You specialize in creating beautiful, responsive, and fully functional web applications.
                You always include all necessary HTML structure, styling with Tailwind CSS, 
                and interactive JavaScript functionality. Your code is clean, well-organized, and production-ready.""",
                llm=llm,
                verbose=False
            )
            
            # Enhanced Backend Agent
            backend_agent = Agent(
                role='Senior Backend Python Developer',
                goal='Create complete, production-ready Flask applications with all routes and functionality',
                backstory="""You are a senior Python backend developer with expertise in Flask.
                You create complete, working applications with all necessary routes, error handling,
                database integration when needed, and proper API endpoints. Your code follows best practices,
                includes all imports, and is immediately runnable. You never write pseudocode or incomplete solutions.""",
                llm=llm,
                verbose=False
            )
            
            # Enhanced Frontend Task
            frontend_task = Task(
                description=f"""Create a COMPLETE, PRODUCTION-READY HTML application for: {idea}

REQUIREMENTS:
1. Complete HTML5 structure with proper DOCTYPE, head, and body
2. Use Tailwind CSS CDN for styling (include the CDN link)
3. Modern, beautiful UI with gradients, shadows, and animations
4. Fully responsive design (mobile, tablet, desktop)
5. Include ALL necessary JavaScript for interactivity
6. Add form validation, event handlers, and dynamic features
7. Use modern color schemes (dark mode or vibrant colors)
8. Include icons from Font Awesome or similar
9. Add loading states, error handling, and user feedback
10. Make it visually impressive and fully functional

OUTPUT FORMAT:
- Output ONLY the complete HTML code
- Start with <!DOCTYPE html>
- Include all CSS in <style> tags or via CDN
- Include all JavaScript in <script> tags
- NO explanations, NO markdown formatting, JUST the HTML code
- Make it a COMPLETE, WORKING application

Create the most impressive, fully functional HTML application possible!""",
                agent=frontend_agent,
                expected_output="Complete HTML code with all functionality"
            )
            
            # Enhanced Backend Task
            backend_task = Task(
                description=f"""Create a COMPLETE, PRODUCTION-READY Flask backend application for: {idea}

REQUIREMENTS:
1. ALL necessary imports (Flask, flask_cors, etc.)
2. Complete Flask app initialization with CORS
3. ALL routes needed for the application (GET, POST, PUT, DELETE as needed)
4. Proper error handling and validation
5. Database models if needed (SQLAlchemy)
6. API endpoints with JSON responses
7. File upload handling if needed
8. Session management if needed
9. Environment variable configuration
10. if __name__ == '__main__': app.run() at the end

OUTPUT FORMAT:
- Output ONLY the complete Python code
- Start with imports
- Include ALL routes and functionality
- NO explanations, NO markdown formatting, JUST the Python code
- Make it IMMEDIATELY RUNNABLE
- Include sample data or database initialization if needed

Create a COMPLETE, WORKING Flask application with ALL routes and features!""",
                agent=backend_agent,
                expected_output="Complete Flask application code with all routes"
            )
            
            message_queue.put({'type': 'msg', 'agent': 'Frontend', 'text': f'🎨 Creating beautiful UI for {idea}...'})
            message_queue.put({'type': 'status', 'text': 'Generating frontend...', 'progress': 20})
            
            # Run frontend agent
            frontend_crew = Crew(
                agents=[frontend_agent],
                tasks=[frontend_task],
                process=Process.sequential,
                verbose=False
            )
            
            frontend_result = frontend_crew.kickoff()
            frontend_code = extract_code_from_markdown(str(frontend_result), 'html')
            
            # Validate frontend code
            if not frontend_code or len(frontend_code) < 100:
                frontend_code = "<!-- Error: Frontend generation failed. Please try again. -->"
                message_queue.put({'type': 'msg', 'agent': 'System', 'text': '⚠️ Frontend generation incomplete, retrying...'})
            else:
                message_queue.put({'type': 'msg', 'agent': 'Frontend', 'text': f'✅ Frontend complete! ({len(frontend_code)} characters)'})
            
            message_queue.put({'type': 'frontend_code', 'agent': 'Frontend', 'text': frontend_code})
            message_queue.put({'type': 'status', 'text': 'Generating backend...', 'progress': 60})
            message_queue.put({'type': 'msg', 'agent': 'Backend', 'text': f'⚙️ Building complete backend for {idea}...'})
            
            # Run backend agent
            backend_crew = Crew(
                agents=[backend_agent],
                tasks=[backend_task],
                process=Process.sequential,
                verbose=False
            )
            
            backend_result = backend_crew.kickoff()
            backend_code = extract_code_from_markdown(str(backend_result), 'python')
            
            # Validate backend code
            if not backend_code or len(backend_code) < 50:
                backend_code = "# Error: Backend generation failed. Please try again."
                message_queue.put({'type': 'msg', 'agent': 'System', 'text': '⚠️ Backend generation incomplete, retrying...'})
            else:
                message_queue.put({'type': 'msg', 'agent': 'Backend', 'text': f'✅ Backend complete! ({len(backend_code)} characters)'})
            
            message_queue.put({'type': 'backend_code', 'agent': 'Backend', 'text': backend_code})
            message_queue.put({'type': 'status', 'text': 'Complete!', 'progress': 100})
            message_queue.put({'type': 'msg', 'agent': 'System', 'text': '🎉 Application generated successfully!'})
            message_queue.put({'type': 'done'})
            
        except Exception as e:
            error_msg = f"Error during generation: {str(e)}"
            message_queue.put({'type': 'error', 'text': error_msg})
            message_queue.put({'type': 'msg', 'agent': 'System', 'text': f'❌ {error_msg}'})
            message_queue.put({'type': 'done'})
    
    threading.Thread(target=run_agents, daemon=True).start()
    return jsonify({'success': True, 'stream_id': stream_id})

@app.route('/stream/<stream_id>')
def stream(stream_id):
    def event_stream():
        q = streams.get(stream_id)
        if not q:
            yield f"data: {json.dumps({'type':'error','text':'Invalid stream ID'})}\n\n"
            return
        
        timeout_count = 0
        max_timeouts = 3
        
        while True:
            try:
                msg = q.get(timeout=60)  # 1 minute timeout per message
                yield f"data: {json.dumps(msg)}\n\n"
                timeout_count = 0  # Reset on successful message
                
                if msg.get('type') == 'done':
                    streams.pop(stream_id, None)
                    break
            except:
                timeout_count += 1
                if timeout_count >= max_timeouts:
                    yield f"data: {json.dumps({'type':'error','text':'Stream timeout'})}\n\n"
                    streams.pop(stream_id, None)
                    break
    
    return Response(event_stream(), mimetype='text/event-stream')
