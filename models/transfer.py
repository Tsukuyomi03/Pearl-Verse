"""
Transfer model for Pearl Verse
Tracks pearl transfers between users
"""

from . import db


class Transfer(db.Model):
    """Pearl transfer model for Pearl Verse"""
    __tablename__ = 'transfers'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Integer, nullable=False)
    message = db.Column(db.String(255))
    status = db.Column(db.String(20), default='completed')  # 'pending', 'completed', 'failed'
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    sender = db.relationship('User', foreign_keys=[sender_id], backref='sent_transfers')
    receiver = db.relationship('User', foreign_keys=[receiver_id], backref='received_transfers')
    
    def to_dict(self):
        """Convert transfer object to dictionary"""
        return {
            'id': self.id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'amount': self.amount,
            'message': self.message,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'sender_username': self.sender.username if self.sender else None,
            'receiver_username': self.receiver.username if self.receiver else None
        }
