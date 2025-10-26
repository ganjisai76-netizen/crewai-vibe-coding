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
    temperature=0.1,
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
            
            frontend_agent = Agent(
                role='Frontend Developer',
                goal='Generate complete HTML with Tailwind CSS',
                backstory='Expert web developer specializing in modern interfaces',
                llm=llm,
                verbose=False
            )
            
            backend_agent = Agent(
                role='Backend Developer',
                goal='Generate clean Python Flask code',
                backstory='Senior backend engineer writing scalable APIs',
                llm=llm,
                verbose=False
            )
            
            frontend_task = Task(
                description=f"""Create HTML for: {idea}

Use Tailwind CSS CDN, dark mode (bg-gray-900), responsive. Output ONLY pure HTML code, no explanations.""",
                agent=frontend_agent,
                expected_output="HTML code"
            )
            
            backend_task = Task(
                description=f"""Create Flask backend for: {idea}

Include routes, logic, imports. Output ONLY Python code, no explanations.""",
                agent=backend_agent,
                expected_output="Python Flask code"
            )
            
            message_queue.put({'type': 'msg', 'agent': 'Frontend', 'text': f'🎨 Designing UI for {idea}...'})
            
            frontend_crew = Crew(
                agents=[frontend_agent],
                tasks=[frontend_task],
                process=Process.sequential,
                verbose=False
            )
            
            frontend_result = frontend_crew.kickoff()
            frontend_code = str(frontend_result)
            
            # Clean up markdown safely
            CODE_FENCE = '```'
            if CODE_FENCE + 'html' in frontend_code:
                parts = frontend_code.split(CODE_FENCE + 'html')
                if len(parts) > 1:
                    frontend_code = parts[1].split(CODE_FENCE)[0].strip()
            elif CODE_FENCE in frontend_code:
                parts = frontend_code.split(CODE_FENCE)
                if len(parts) > 2:
                    frontend_code = parts[1].strip()
            
            message_queue.put({'type': 'frontend_code', 'agent': 'Frontend', 'text': frontend_code})
            message_queue.put({'type': 'msg', 'agent': 'Backend', 'text': f'⚙️ Building backend logic for {idea}...'})
            
            backend_crew = Crew(
                agents=[backend_agent],
                tasks=[backend_task],
                process=Process.sequential,
                verbose=False
            )
            
            backend_result = backend_crew.kickoff()
            backend_code = str(backend_result)
            
            # Clean up markdown safely
            CODE_FENCE = '```'
            if CODE_FENCE + 'python' in backend_code:
                parts = backend_code.split(CODE_FENCE + 'python')
                if len(parts) > 1:
                    backend_code = parts[1].split(CODE_FENCE)[0].strip()
            elif CODE_FENCE in backend_code:
                parts = backend_code.split(CODE_FENCE)
                if len(parts) > 2:
                    backend_code = parts[1].strip()
            
            message_queue.put({'type': 'backend_code', 'agent': 'Backend', 'text': backend_code})
            message_queue.put({'type': 'done'})
            
        except Exception as e:
            message_queue.put({'type': 'error', 'text': str(e)})
            message_queue.put({'type': 'done'})
    
    threading.Thread(target=run_agents, daemon=True).start()
    return jsonify({'success': True, 'stream_id': stream_id})

@app.route('/stream/<stream_id>')
def stream(stream_id):
    def event_stream():
        q = streams.get(stream_id)
        if not q:
            yield f"data: {json.dumps({'type':'error','text':'Invalid stream'})}\n\n"
            return
        while True:
            try:
                msg = q.get(timeout=300)
                yield f"data: {json.dumps(msg)}\n\n"
                if msg.get('type') == 'done':
                    streams.pop(stream_id, None)
                    break
            except:
                break
    return Response(event_stream(), mimetype='text/event-stream')
