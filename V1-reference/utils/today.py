from datetime import datetime

def get_today_string():
    today =  datetime.now()
    timeString = today.strftime("%Y-%m-%d")
    return timeString
