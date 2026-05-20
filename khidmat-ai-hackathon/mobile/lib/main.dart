import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

void main() {
  runApp(const KhidmatApp());
}

class KhidmatApp extends StatelessWidget {
  const KhidmatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'KHIDMAT AI',
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0A192F),
        primaryColor: const Color(0xFF006D77),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF006D77),
          secondary: Color(0xFFF4A261),
        ),
        fontFamily: 'Roboto', 
      ),
      home: const SplashOnboardingScreen(),
    );
  }
}

class SplashOnboardingScreen extends StatefulWidget {
  const SplashOnboardingScreen({super.key});

  @override
  State<SplashOnboardingScreen> createState() => _SplashOnboardingScreenState();
}

class _SplashOnboardingScreenState extends State<SplashOnboardingScreen> {
  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const HomeScreen()));
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF006D77),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.handshake, size: 80, color: Color(0xFFF4A261)),
            const SizedBox(height: 20),
            const Text(
              'KHIDMAT AI',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, letterSpacing: 3, color: Colors.white),
            ),
            const SizedBox(height: 10),
            Text(
              'Autonomous Service Orchestrator',
              style: TextStyle(fontSize: 14, color: Colors.white.withOpacity(0.8)),
            )
          ],
        ),
      ),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final TextEditingController _controller = TextEditingController();
  bool _isListening = false;

  void _submitRequest(String text) {
    if (text.isEmpty) return;
    Navigator.push(context, MaterialPageRoute(builder: (_) => ProcessingScreen(requestText: text)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KHIDMAT AI', style: TextStyle(letterSpacing: 2, fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF006D77),
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.history), onPressed: () {}),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'What do you need help with?',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0xFFF4A261).withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
                  child: const Text('AUTO-DETECT LANGUAGE', style: TextStyle(color: Color(0xFFF4A261), fontSize: 10, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 30),
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF112240),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF006D77), width: 1),
              ),
              child: TextField(
                controller: _controller,
                maxLines: 4,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'e.g., Mujhe kal subah G-13 mein AC technician chahiye...',
                  hintStyle: TextStyle(color: Colors.white.withOpacity(0.4)),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                GestureDetector(
                  onTap: () {
                    setState(() => _isListening = !_isListening);
                    if (_isListening) {
                      Future.delayed(const Duration(seconds: 2), () {
                        setState(() {
                          _controller.text = "Mujhe kal subah G-13 mein AC technician chahiye";
                          _isListening = false;
                        });
                      });
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _isListening ? const Color(0xFFF4A261) : const Color(0xFF112240),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(Icons.mic, color: _isListening ? Colors.white : const Color(0xFFF4A261)),
                  ),
                ),
                ElevatedButton(
                  onPressed: () => _submitRequest(_controller.text),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF006D77),
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  ),
                  child: const Text('Orchestrate', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                )
              ],
            ),
            const SizedBox(height: 40),
            const Text('Quick Actions', style: TextStyle(color: Colors.grey, fontSize: 14)),
            const SizedBox(height: 10),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                _buildQuickAction('❄️ AC Repair'),
                _buildQuickAction('🚰 Plumber'),
                _buildQuickAction('⚡ Electrician'),
                _buildQuickAction('📚 Tutor'),
                _buildQuickAction('🧹 Cleaning'),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildQuickAction(String label) {
    return ActionChip(
      label: Text(label, style: const TextStyle(color: Colors.white)),
      backgroundColor: const Color(0xFF112240),
      onPressed: () => _controller.text = label,
    );
  }
}

class ProcessingScreen extends StatefulWidget {
  final String requestText;
  const ProcessingScreen({super.key, required this.requestText});

  @override
  State<ProcessingScreen> createState() => _ProcessingScreenState();
}

class _ProcessingScreenState extends State<ProcessingScreen> {
  List<Map<String, dynamic>> logs = [];
  Map<String, dynamic>? orchestratorResult;

  @override
  void initState() {
    super.initState();
    _startOrchestration();
  }

  Future<void> _startOrchestration() async {
    
    try {
      final response = await http.post(
        Uri.parse('http://10.0.2.2:8080/orchestrate'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_input': widget.requestText, 'session_id': 'sess_123'}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        _simulateTrace(data['logs'], data);
      } else {
        _fallbackSimulate();
      }
    } catch (e) {
      _fallbackSimulate();
    }
  }

  void _fallbackSimulate() {
    
    final mockLogs = [
      {"agent": "INTENT_AGENT", "action": "parsed", "output": {"service_type": "AC Technician", "location": "G-13, Islamabad"}},
      {"agent": "MATCHING_AGENT", "action": "find_and_rank", "output": {"service": "AC Technician"}},
      {"agent": "MATCHING_AGENT", "action": "ranked", "output": {"count": 3, "top": "Tariq HVAC Experts"}},
      {"agent": "PRICING_AGENT", "action": "generate_quote", "output": {"provider": "Tariq HVAC Experts"}},
      {"agent": "BOOKING_AGENT", "action": "confirmed", "output": {"status": "confirmed", "booking_id": "KHIDMAT-123"}},
    ];
    final mockData = {
      "provider": {"name": "Tariq HVAC Experts", "rating": 4.8, "distance_km": 3.5, "base_rate_pkr": 1500},
      "quote": {"total_estimate_pkr": 1800, "breakdown_text": "Base: 1500, Distance: 300"},
      "booking": {"booking_id": "KHIDMAT-12345", "slot_datetime": "10:00"}
    };
    _simulateTrace(mockLogs, mockData);
  }

  void _simulateTrace(List<dynamic> incomingLogs, Map<String, dynamic> result) {
    int index = 0;
    Timer.periodic(const Duration(milliseconds: 800), (timer) {
      if (index < incomingLogs.length) {
        setState(() {
          logs.add(incomingLogs[index]);
        });
        index++;
      } else {
        timer.cancel();
        Future.delayed(const Duration(seconds: 1), () {
          Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => ResultsScreen(result: result)));
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(backgroundColor: Colors.transparent, elevation: 0),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Antigravity Pipeline', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFFF4A261))),
            const SizedBox(height: 8),
            const Text('Orchestrating agents...', style: TextStyle(color: Colors.grey)),
            const SizedBox(height: 30),
            Expanded(
              child: ListView.builder(
                itemCount: logs.length,
                itemBuilder: (context, i) {
                  final log = logs[i];
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF112240),
                      border: Border(left: BorderSide(color: const Color(0xFF006D77), width: 4)),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('[${log["agent"]}]', style: const TextStyle(color: Color(0xFF006D77), fontWeight: FontWeight.bold, fontSize: 12)),
                        const SizedBox(height: 4),
                        Text(log["action"].toString().toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(log["output"].toString(), style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12, fontFamily: 'monospace')),
                      ],
                    ),
                  );
                },
              ),
            ),
            const Center(child: CircularProgressIndicator(color: Color(0xFFF4A261))),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }
}

class ResultsScreen extends StatelessWidget {
  final Map<String, dynamic> result;
  const ResultsScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final provider = result['provider'];
    final quote = result['quote'];
    final booking = result['booking'];

    return Scaffold(
      appBar: AppBar(title: const Text('Matched Provider'), backgroundColor: const Color(0xFF006D77)),
      body: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(color: const Color(0xFF112240), borderRadius: BorderRadius.circular(16)),
              child: Column(
                children: [
                  const CircleAvatar(radius: 40, backgroundColor: Color(0xFF006D77), child: Icon(Icons.person, size: 40, color: Colors.white)),
                  const SizedBox(height: 16),
                  Text(provider['name'], style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.star, color: Color(0xFFF4A261), size: 18),
                      Text(' ${provider['rating']}  •  ', style: const TextStyle(color: Colors.white)),
                      Text('${provider['distance_km']} km away', style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            const Text('PRICING AGENT QUOTE', style: TextStyle(color: Color(0xFFF4A261), fontWeight: FontWeight.bold, letterSpacing: 1)),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(border: Border.all(color: const Color(0xFF006D77)), borderRadius: BorderRadius.circular(8)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Estimated Total: PKR ${quote['total_estimate_pkr']}', style: const TextStyle(fontSize: 20, color: Colors.white, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(quote['breakdown_text'], style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
            const Spacer(),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  
                  showDialog(
                    context: context,
                    builder: (_) => AlertDialog(
                      backgroundColor: const Color(0xFF112240),
                      title: const Text('Booking Confirmed', style: TextStyle(color: Colors.white)),
                      content: Text('ID: ${booking['booking_id']}\nSlot: ${booking['slot_datetime']}', style: const TextStyle(color: Colors.white)),
                      actions: [
                        TextButton(onPressed: () => Navigator.popUntil(context, (route) => route.isFirst), child: const Text('Home', style: TextStyle(color: Color(0xFFF4A261))))
                      ],
                    )
                  );
                },
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF4A261), padding: const EdgeInsets.symmetric(vertical: 16)),
                child: const Text('CONFIRM BOOKING', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.black)),
              ),
            )
          ],
        ),
      ),
    );
  }
}
