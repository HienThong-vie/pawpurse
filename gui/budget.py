import tkinter as tk
import tkinter.ttk as ttk
from colors_scheme import COLORS
from core.data_manager import (
    get_budget,
    add_budget,
    delete_budget,
    get_categories
)

def build_budget_page(frame,data):
    def refresh_grid():
        for widget in grid_frame.winfo_children():
            widget.destroy()
        budgets = get_budget(data)
        #.items() give you the dict keys and values inside it
        for index, (category,budget) in enumerate(budgets.items()):
            row = index // 4
            col = index % 4

            card = tk.Frame(
                grid_frame,
                bg=COLORS["bg_card"],
                relief = "solid", # give the frame border
                bd = 1 #adjust the border width
            )
            card.grid(row= row,column= col,sticky="nsew",padx=8,pady=8) # we use grid here because we can control row and col of the widgets
            category_name = tk.Label(
                card,
                text=category,
                font=("Segoe UI", 13, "bold"),
                bg=COLORS["bg_card"],
                fg=COLORS["text_primary"],
                pady=10,
            )
            limit_label = tk.Label(
                card,
                text=f"Limit: ${budget['limit']}",
                bg=COLORS["bg_card"],
                fg=COLORS["text_secondary"],
                font=("Segoe UI", 10) 
            )
            period_label = tk.Label(
                card,
                text=f"📅 {budget['period'].capitalize()}",
                bg=COLORS["bg_card"],
                fg=COLORS["text_secondary"],
                font=("Segoe UI", 10) 
            )
            category_name.pack(fill="x",padx=10)
            limit_label.pack(anchor="center",padx=15)
            period_label.pack(anchor="center",padx=15,pady=(0,5))

            delete_button = tk.Button(
                card,
                text="🗑️ Delete",
                bg=COLORS["status_exceeded"],
                command=lambda c=category: [delete_budget(data, c), refresh_grid()],
                border=0,
                cursor="hand2"
            )
            delete_button.pack(fill="x",padx=10,pady=(5,10))

    def clear_form():
        category_combobox.set("")
        period_combobox.set("")
        limit_entry.delete(0,tk.END)

    def submit_budget():
        category = category_combobox.get()
        period = period_combobox.get()
        try:
            limit = float(limit_entry.get())
        except:
            return

        if not category or not period or not limit:
            return
        
        add_budget(data,category,limit,period)
        clear_form()
        refresh_grid()



    page_title = tk.Label(
        frame,
        text ="🎯 Budget",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font = ("Segoe UI", 18, "bold")
    )
    form_frame = tk.LabelFrame(
        frame,
        text="ADD BUDGET",
        bg=COLORS["bg_main"],
        fg=COLORS["text_secondary"],
        font=("Segoe UI", 10, "bold"),
        padx=15,
        pady=10, 
    )
    edit_category = tk.StringVar()
    edit_category.set("")
    category_label = tk.Label(
        form_frame,
        text = "Category",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10) 
    )
    category_combobox = ttk.Combobox(
        form_frame,
        values = get_categories(data),
        state="readonly"
    )
    limit_label = tk.Label(
        form_frame,
        text = "Limit",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10) 
    )
    limit_entry = tk.Entry(
        form_frame,
    )
    period_label = tk.Label(
        form_frame,
        text = "period",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font=("Segoe UI", 10)
    )
    period_combobox = ttk.Combobox(
        form_frame,
        values = ["month","week"],
        state="readonly"
    )
    submit_button = tk.Button(
        form_frame,
        command = submit_budget,
        text="Submit",
        bg=COLORS["accent"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10, "bold"),
        relief="solid",
        bd=1,
        cursor="hand2",
        width=15
    )
    form_frame.columnconfigure(1,weight=1)

    page_title.pack(anchor="w",padx=20,pady=15)
    form_frame.pack(fill="x", padx=20, pady=10)

    category_label.grid(row=0,column=0,sticky="w",pady=5)
    category_combobox.grid(row=0,column=1,sticky="ew",pady=5,padx=10)

    limit_label.grid(row=1,column=0,sticky="w",pady=5)
    limit_entry.grid(row=1,column=1,sticky="ew",pady=5,padx=10)

    period_label.grid(row=2,column=0,sticky="w",pady=5)
    period_combobox.grid(row=2,column=1,sticky="ew",pady=5,padx=10)

    submit_button.grid(row=3,column=1,sticky="e",pady=10) # if other widgets use grid, we must use grid for all widgets inside a parent

    """ Done the submit budget frame"""

    grid_frame = tk.Frame(
        frame,
        bg=COLORS["bg_main"],
    )
    grid_frame.pack(fill="both",expand=True,padx=20,pady=10)
    for i in range(4):
        grid_frame.columnconfigure(i,weight=1)

    refresh_grid()
