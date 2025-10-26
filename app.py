from flask import Flask, render_template, request, jsonify, Response
from flask_cors import CORS
import os
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
    model="gemini/gemini-2.5-flash",
    api_key=os.getenv("GEMINI_API_KEY"),
    temperature=0.2,
)

streams = {}

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
            message_queue.put({'type': 'msg', 'agent': 'System', 'text': '🚀 Initializing Vibe Coding agents...'})
            time.sleep(0.3)
            
            # Frontend Agent - Generates HTML/CSS/JS
            frontend_agent = Agent(
                role='Frontend Developer',
                goal='Generate complete, production-ready HTML with Tailwind CSS and JavaScript',
                backstory='Expert UI/UX developer specializing in modern, dark-mode interfaces with beautiful gradients and responsive design',
                llm=llm,
                verbose=False
            )
            
            # Backend Agent - Generates Flask/Python pseudocode
            backend_agent = Agent(
                role='Backend Developer',
                goal='Generate clean, well-structured Python Flask backend code',
                backstory='Senior backend engineer who writes elegant, scalable API endpoints and business logic',
                llm=llm,
                verbose=False
            )
            
            frontend_task = Task(
                description=f"""Create a complete, single-file HTML application for: {idea}

Requirements:
- Start with <!DOCTYPE html>
- Use Tailwind CSS via CDN for styling
- Dark mode design (bg-gray-900, text-white)
- Modern gradients and rounded corners
- Fully responsive layout
- Include all JavaScript functionality inline
- Beautiful, minimalist aesthetic
- NO markdown formatting, NO explanations, ONLY pure HTML code
- The code must be immediately runnable""",
                agent=frontend_agent,
                expected_output="Complete HTML file with Tailwind CSS and JavaScript"
            )
            
            backend_task = Task(
                description=f"""Create Python Flask backend pseudocode/code for: {idea}

Requirements:
- Flask route definitions with @app.route decorators
- Function implementations with clear logic
- API endpoints that would support the frontend
- Include necessary imports
- Add comments explaining key logic
- Use proper Python syntax
- Keep it concise but functional
- NO markdown formatting, just clean Python code""",
                agent=backend_agent,
                expected_output="Python Flask backend code with routes and logic"
            )
            
            message_queue.put({'type': 'msg', 'agent': 'Frontend', 'text': f'🎨 Designing UI for {idea}...'})
            
            # Run frontend agent
            frontend_crew = Crew(
                agents=[frontend_agent],
                tasks=[frontend_task],
                process=Process.sequential,
                verbose=False
            )
            
            frontend_result = frontend_crew.kickoff()
            frontend_code = str(frontend_result)
            
            # Clean up markdown if present
            if '```html' in frontend_code:
                frontend_code = frontend_code.split('```html')[1].split('```')[0].strip()
            elif '```' in frontend_code:
                frontend_code = frontend_code.split('```')[1].split('```')[0].strip()
            
            message_queue.put({'type': 'frontend_code', 'agent': 'Frontend', 'text': frontend_code})
            message_queue.put({'type': 'msg', 'agent': 'Backend', 'text': f'⚙️ Building backend logic for {idea}...'})
            
            # Run backend agent
            backend_crew = Crew(
                agents=[backend_agent],
                tasks=[backend_task],
                process=Process.sequential,
                verbose=False
            )
            
            backend_result = backend_crew.kickoff()
            backend_code = str(backend_result)
            
            # Clean up markdown if present
            if '```python' in backend_code:
                backend_code = backend_code.split('```python')[1].split('```')[0].strip()
            elif '```' in backend_code:
                backend_code = backend_code.split('```')[1].split('```')[0].strip()
            
            message_queue.put({'type': 'backend_code', 'agent': 'Backend', 'text': backend_code})
            message_queue.put({'type': 'done'})
            
        except Exception as e:
            message_queue.put({'type': 'error', 'text': str(e)})
            message_queue.put({'type': 'done'})
    
    threading.Thread(target=run_agents).start()
    return jsonify({'success': True, 'stream_id': stream_id})

@app.route('/stream/<stream_id>')
def stream(stream_id):
    def event_stream():
        q = streams.get(stream_id)
        if not q:
            yield f"data: {json.dumps({'type':'error','text':'Invalid stream'})}\n\n"
            return
        while True:
            msg = q.get()
            yield f"data: {json.dumps(msg)}\n\n"
            if msg.get('type') == 'done':
                streams.pop(stream_id, None)
                break
    return Response(event_stream(), mimetype='text/event-stream')
