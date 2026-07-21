import 'dart:async';
import 'package:flutter/material.dart';
import 'package:customer_mobile/widgets/bottom_navigation.dart';
import 'package:intl/intl.dart';

class ChatConversation {
  final String name;
  final String avatarUrl;
  final String lastMessage;
  final String time;
  final int unreadCount;
  final bool isVerified;
  final List<Map<String, dynamic>> messages;

  ChatConversation({
    required this.name,
    required this.avatarUrl,
    required this.lastMessage,
    required this.time,
    required this.unreadCount,
    this.isVerified = false,
    required this.messages,
  });
}

class ChatListScreen extends StatefulWidget {
  final Function(int, {Map<String, dynamic>? arguments}) onNavigate;
  final Map<String, dynamic>? arguments;

  const ChatListScreen({
    Key? key,
    required this.onNavigate,
    this.arguments,
  }) : super(key: key);

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  // Predefined mock chats
  final List<ChatConversation> chats = [
    ChatConversation(
      name: 'TripKita Support',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      lastMessage: 'Halo Kak Budi, ada yang bisa kami bantu terkait keberangkatan Raja Ampat?',
      time: '14:30',
      unreadCount: 2,
      isVerified: true,
      messages: [
        {'isSender': false, 'text': 'Selamat siang Kak Budi! Terima kasih telah memesan melalui TripKita.', 'time': '14:25'},
        {'isSender': false, 'text': 'Halo Kak Budi, ada yang bisa kami bantu terkait keberangkatan Raja Ampat?', 'time': '14:30'},
      ],
    ),
    ChatConversation(
      name: 'Raja Ampat Adventure',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      lastMessage: 'Selamat siang, untuk penjemputan di Bandara Sorong nanti jam 08:00 WIT ya.',
      time: '11:15',
      unreadCount: 1,
      messages: [
        {'isSender': true, 'text': 'Halo, apakah meeting point di Bandara Sorong sudah termasuk antar jemput ke resort?', 'time': '10:45'},
        {'isSender': false, 'text': 'Betul Kak Budi, nanti akan ada driver kami yang stand by membawa papan nama TripKita.', 'time': '11:00'},
        {'isSender': false, 'text': 'Selamat siang, untuk penjemputan di Bandara Sorong nanti jam 08:00 WIT ya.', 'time': '11:15'},
      ],
    ),
    ChatConversation(
      name: 'Bajo Tour Organizer',
      avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=100',
      lastMessage: 'Sama-sama Kak, sampai jumpa di Labuan Bajo!',
      time: 'Kemarin',
      unreadCount: 0,
      messages: [
        {'isSender': true, 'text': 'Terima kasih atas infonya Kak.', 'time': 'Kemarin'},
        {'isSender': false, 'text': 'Sama-sama Kak, sampai jumpa di Labuan Bajo!', 'time': 'Kemarin'},
      ],
    ),
  ];

  ChatConversation? activeConversation;
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  void _openConversation(ChatConversation chat) {
    setState(() {
      activeConversation = chat;
    });
    // Mark as read
    final idx = chats.indexOf(chat);
    if (idx != -1) {
      setState(() {
        chats[idx] = ChatConversation(
          name: chat.name,
          avatarUrl: chat.avatarUrl,
          lastMessage: chat.lastMessage,
          time: chat.time,
          unreadCount: 0,
          isVerified: chat.isVerified,
          messages: chat.messages,
        );
      });
    }
    _scrollToBottom();
  }

  void _scrollToBottom() {
    Timer(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty || activeConversation == null) return;

    _messageController.clear();
    final timeStr = DateFormat('HH:mm').format(DateTime.now());

    setState(() {
      activeConversation!.messages.add({
        'isSender': true,
        'text': text,
        'time': timeStr,
      });
    });
    _scrollToBottom();

    // Simulate mock reply after 1.5 seconds
    Timer(const Duration(seconds: 1), () {
      if (mounted && activeConversation != null) {
        String replyText = 'Baik Kak Budi, pesan Anda telah kami terima. Mohon tunggu sebentar ya, Customer Service / Provider kami sedang meninjau pertanyaan Anda.';
        if (activeConversation!.name.contains('Support')) {
          replyText = 'Tentu Kak Budi, agen support kami sedang memeriksa detail tiket booking Anda. Mohon ditunggu.';
        } else if (activeConversation!.name.contains('Bajo')) {
          replyText = 'Siap Kak! Ada lagi yang perlu dipersiapkan untuk trip Labuan Bajo nanti?';
        }

        setState(() {
          activeConversation!.messages.add({
            'isSender': false,
            'text': replyText,
            'time': DateFormat('HH:mm').format(DateTime.now()),
          });
        });
        _scrollToBottom();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (activeConversation != null) {
      return _buildConversationView();
    }

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFA),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        automaticallyImplyLeading: false,
        title: const Text(
          'Kotak Masuk Pesan',
          style: TextStyle(color: Color(0xFF1F2937), fontWeight: FontWeight.bold, fontSize: 18),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Search box
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: TextField(
                decoration: InputDecoration(
                  hintText: 'Cari pesan atau provider...',
                  hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                  prefixIcon: Icon(Icons.search, color: Colors.grey.shade400),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                ),
              ),
            ),
          ),

          // Inbox List
          Expanded(
            child: chats.isEmpty
                ? _buildEmptyState()
                : ListView.builder(
                    itemCount: chats.length,
                    itemBuilder: (context, index) {
                      final chat = chats[index];
                      return _buildChatTile(chat);
                    },
                  ),
          ),
        ],
      ),
      bottomNavigationBar: TripKitaBottomNavigation(
        currentIndex: 3, // Chat tab is index 3
        onTap: (index) {
          widget.onNavigate(index);
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.chat_bubble_outline, size: 60, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            const Text(
              'Belum Ada Pesan',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF4B5563)),
            ),
            const SizedBox(height: 8),
            Text(
              'Hubungi provider trip atau customer service untuk memulai percakapan.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatTile(ChatConversation chat) {
    return Container(
      color: Colors.white,
      child: Column(
        children: [
          ListTile(
            onTap: () => _openConversation(chat),
            leading: CircleAvatar(
              radius: 24,
              backgroundImage: NetworkImage(chat.avatarUrl),
            ),
            title: Row(
              children: [
                Text(
                  chat.name,
                  style: TextStyle(
                    fontWeight: chat.unreadCount > 0 ? FontWeight.bold : FontWeight.w600,
                    fontSize: 14,
                    color: const Color(0xFF1F2937),
                  ),
                ),
                if (chat.isVerified) ...[
                  const SizedBox(width: 4),
                  const Icon(Icons.verified, size: 14, color: Color(0xFF0F8B8D)),
                ],
              ],
            ),
            subtitle: Padding(
              padding: const EdgeInsets.only(top: 4.0),
              child: Text(
                chat.lastMessage,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: chat.unreadCount > 0 ? const Color(0xFF1F2937) : const Color(0xFF6B7280),
                  fontWeight: chat.unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
                  fontSize: 12,
                ),
              ),
            ),
            trailing: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  chat.time,
                  style: TextStyle(
                    color: chat.unreadCount > 0 ? const Color(0xFF0F8B8D) : const Color(0xFF9CA3AF),
                    fontSize: 10,
                    fontWeight: chat.unreadCount > 0 ? FontWeight.bold : FontWeight.normal,
                  ),
                ),
                if (chat.unreadCount > 0) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F8B8D),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 18,
                      minHeight: 18,
                    ),
                    child: Text(
                      chat.unreadCount.toString(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Divider(height: 1, thickness: 0.5, color: Colors.grey.shade100, indent: 76),
        ],
      ),
    );
  }

  Widget _buildConversationView() {
    final chat = activeConversation!;

    return Scaffold(
      backgroundColor: const Color(0xFFF3F4F6),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0.5,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF374151)),
          onPressed: () {
            setState(() {
              activeConversation = null;
            });
          },
        ),
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundImage: NetworkImage(chat.avatarUrl),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        chat.name,
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                      ),
                      if (chat.isVerified) ...[
                        const SizedBox(width: 4),
                        const Icon(Icons.verified, size: 12, color: Color(0xFF0F8B8D)),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  const Text('Online', style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.w500)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(icon: const Icon(Icons.call_outlined, size: 20, color: Color(0xFF4B5563)), onPressed: () {}),
          IconButton(icon: const Icon(Icons.more_vert_outlined, size: 20, color: Color(0xFF4B5563)), onPressed: () {}),
        ],
      ),
      body: Column(
        children: [
          // Messages Timeline
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
              itemCount: chat.messages.length,
              itemBuilder: (context, index) {
                final message = chat.messages[index];
                final bool isSender = message['isSender'] as bool;

                return Align(
                  alignment: isSender ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    decoration: BoxDecoration(
                      color: isSender ? const Color(0xFF0F8B8D) : Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(16),
                        topRight: const Radius.circular(16),
                        bottomLeft: isSender ? const Radius.circular(16) : Radius.zero,
                        bottomRight: isSender ? Radius.zero : const Radius.circular(16),
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.015),
                          blurRadius: 5,
                          offset: const Offset(0, 2),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          message['text'] as String,
                          style: TextStyle(
                            color: isSender ? Colors.white : const Color(0xFF374151),
                            fontSize: 13,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          message['time'] as String,
                          style: TextStyle(
                            color: isSender ? Colors.white60 : Colors.grey.shade400,
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Message Input Field
          Container(
            padding: EdgeInsets.only(
              left: 16,
              right: 16,
              top: 10,
              bottom: MediaQuery.of(context).viewInsets.bottom + 10,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(top: BorderSide(color: Color(0xFFE5E7EB), width: 1)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          icon: const Icon(Icons.sentiment_satisfied_alt_outlined, color: Color(0xFF6B7280)),
                          onPressed: () {},
                        ),
                        Expanded(
                          child: TextField(
                            controller: _messageController,
                            style: const TextStyle(fontSize: 13),
                            decoration: const InputDecoration(
                              hintText: 'Tulis pesan...',
                              border: InputBorder.none,
                              contentPadding: EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.attach_file_outlined, color: Color(0xFF6B7280)),
                          onPressed: () {},
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: const Color(0xFF0F8B8D),
                  radius: 20,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white, size: 18),
                    onPressed: _sendMessage,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
