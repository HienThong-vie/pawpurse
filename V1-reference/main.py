from core.data_manager import load_data
import tkinter as tk
from colors_scheme import COLORS
from gui.transactions import build_transactions_page
from gui.dashboard import build_dashboard_page
from gui.budget import build_budget_page
from gui.advisor import build_advisor_page
from gui.charts import build_chart_page
from ctypes import windll
try:
    windll.shcore.SetProcessDpiAwareness(1)
except:
    pass

def show_frame(frame,rebuild=None):
    frame.tkraise()
    if rebuild is not None:
        for widget in frame.winfo_children():
            widget.destroy()
        rebuild()

def main():
    data = load_data()  
    root = tk.Tk()
    root.minsize(1800,1200)

    root.title("Smart Finance Tracker")

    #creating widgets is like buying furniture 
    content_frame = tk.Frame(
        root,
        bg = COLORS["bg_main"]
    )
    dashboard_frame = tk.Frame(
        content_frame,
        bg = COLORS["bg_main"]
    )
    transactions_frame = tk.Frame(
        content_frame,
        bg = COLORS["bg_main"]
    )
    budget_frame = tk.Frame(
        content_frame,
        bg = COLORS["bg_main"]
        
    )
    charts_frame = tk.Frame(
        content_frame,
        bg = COLORS["bg_main"]
    )
    advisor_frame = tk.Frame(
        content_frame,
        bg = COLORS["bg_main"]
    )
    sidebar_frame = tk.Frame(
        root,
        bg = COLORS["bg_sidebar"],
        width = 200
    )
    sidebar_label = tk.Label(
        sidebar_frame,
        text = "💰 Finance",
        bg = COLORS["bg_sidebar"],
        fg = COLORS["text_light"],
        font = ("Segoe UI", 16, "bold"),
        pady = 30
    )
    nav_buttons = [
        ("📊 Dashboard",lambda:show_frame(dashboard_frame,lambda: build_dashboard_page(dashboard_frame,data))),
        ("💸 Transactions",lambda:show_frame(transactions_frame)), # this page refresh internally
        ("🎯 Budgets",lambda:show_frame(budget_frame,lambda: build_budget_page(budget_frame,data))),
        ("📈 Charts",lambda:show_frame(charts_frame,lambda: build_chart_page(charts_frame,data))),
        ("🤖 Advisor",lambda:show_frame(advisor_frame, lambda: build_advisor_page(advisor_frame,data)))
    ]
    """
    fill="both" — stretches to fill available space in both directions
    fill="y" — stretches vertically only
    expand=True — allows the widget to grow and take extra space
    """
    #pack() method is for placing furniture. Without pack(), widgets don't know where to appear
    content_frame.pack(side="left",fill="both",expand=True)
                       
    dashboard_frame.place(relx=0, rely=0, relwidth=1, relheight=1)
    transactions_frame.place(relx=0, rely=0, relwidth=1, relheight=1)
    budget_frame.place(relx=0, rely=0, relwidth=1, relheight=1)
    charts_frame.place(relx=0, rely=0, relwidth=1, relheight=1)
    advisor_frame.place(relx=0, rely=0, relwidth=1, relheight=1)
    show_frame(dashboard_frame,build_dashboard_page(dashboard_frame,data))

    sidebar_frame.pack(side="right",fill="y")
    sidebar_label.pack(fill="x")
    for button, command in nav_buttons:
        btn = tk.Button (  # the tk.Button has default event as "click"
            sidebar_frame,
            text = button,
            command = command,
            bg = COLORS["bg_sidebar"],
            fg = COLORS["text_light"],
            font = ("Segoe UI",11),
            border = 0,
            cursor = "hand2", # this change the pointer cursor into a hand cursor
            anchor = "w", # this control where the text appear in the button, w stand for west, means text appear in the west of the button
            padx = 50,
            pady = 20
        )

        btn.pack(fill="x")
        
        btn.bind("<Enter>",lambda e, b=btn: b.config(bg=COLORS["accent"])) # Enter is a event so we have to add <>
        btn.bind("<Leave>",lambda e, b=btn: b.config(bg=COLORS["bg_sidebar"]))
        # explaination for this bind() section is in the document 
    build_transactions_page(transactions_frame,data)

    #close shortcut
    
    def close_program(event=None):
        root.destroy()

    root.bind("<Control-e>",close_program)

    root.mainloop() 
if __name__ == "__main__":
    main()
    
