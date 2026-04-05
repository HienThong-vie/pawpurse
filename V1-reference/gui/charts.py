import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
import numpy as np
import tkinter as tk
import tkinter.ttk as ttk
from colors_scheme import COLORS
from core.data_manager import get_transaction
from core.algorithm import analyze_budgets,merge_sort
from datetime import datetime

def build_chart_page(frame,data):
    #data needed
    transactions = get_transaction(data)
    analysis_data = analyze_budgets(data)
    current_tab = ["donut"]
    current_filter = ["all"]
    #function
    def apply_filter(filter_name):  
        current_filter[0] = filter_name
        if current_filter[0] == "week":
            week_button.configure(bg=COLORS["accent"])
            month_button.configure(bg=COLORS["bg_sidebar"])
            all_button.configure(bg=COLORS["bg_sidebar"])
        elif current_filter[0] == "month":
            week_button.configure(bg=COLORS["bg_sidebar"])
            month_button.configure(bg=COLORS["accent"])
            all_button.configure(bg=COLORS["bg_sidebar"])
        else:
            week_button.configure(bg=COLORS["bg_sidebar"])
            month_button.configure(bg=COLORS["bg_sidebar"])
            all_button.configure(bg=COLORS["accent"])
        
        if current_tab[0] == "donut":
            show_donut()
        else:
            show_bar()

        
    def get_filtered_transactions():
        result = []
        today = datetime.now()
        current_week = today.isocalendar()[1] # return week numbers which in total is month
        current_year = today.year
        for transaction in transactions:
            trans_date = datetime.strptime(transaction["time"], "%Y-%m-%d")
            trans_week = trans_date.isocalendar()[1]
            trans_year = trans_date.year
            trans_month = trans_date.strftime("%Y-%m")
            if current_filter[0] == "all":
                result.append(transaction)
            if current_filter[0] == "month":
                if trans_month == today.strftime("%Y-%m"):
                   result.append(transaction)
            if current_filter[0] == "week":
                if trans_week == current_week and trans_year == current_year:
                    result.append(transaction)
        return result
    def show_donut():
        current_tab[0] = "donut"
        if analysis_data:
            for widget in donut_frame.winfo_children():
                widget.destroy()
            build_donut_chart()
            donut_frame.pack(fill="both",expand=True,padx=20,pady=15 )
            spending_breakdown_button.configure(bg=COLORS["accent"])
            monthly_trend_button.configure(bg=COLORS["bg_sidebar"])
            bar_frame.pack_forget()
    def show_bar():
        current_tab[0] = "bar"
        if analysis_data:
            for widget in bar_frame.winfo_children():
                widget.destroy()
            build_bar_chart()
            bar_frame.pack(fill="both",expand=True,padx=20,pady=15)
            monthly_trend_button.configure(bg=COLORS["accent"])
            spending_breakdown_button.configure(bg=COLORS["bg_sidebar"])
            donut_frame.pack_forget()
    #widgets
    page_title = tk.Label(
        frame,
        text = "📈 Charts",
        bg= COLORS["bg_main"],
        fg= COLORS["text_primary"],
        font = ("Segoe UI", 18, "bold")
    )
    tab_frame = tk.Frame(
        frame,
    )
    spending_breakdown_button = tk.Button(
        tab_frame,
        text="🍩 Spending Breakdown",
        bg = COLORS["accent"],
        command=show_donut,
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
    )
    monthly_trend_button = tk.Button(
        tab_frame,
        text="📊 Monthly Trend",
        bg = COLORS["bg_sidebar"],
        command=show_bar,
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
    )
    chart_container = tk.Frame(
        frame,
        bg=COLORS["bg_main"]
    )
    donut_frame = tk.Frame(
        chart_container,
    )
    bar_frame = tk.Frame(
        chart_container
    )
    filter_frame = tk.Frame(
        frame,
        bg=COLORS["bg_main"]
    )
    week_button = tk.Button(
        filter_frame,
        text="This Week",
        bg = COLORS["bg_sidebar"],
        command=lambda: apply_filter("week"),
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
        )
    month_button = tk.Button(
        filter_frame,
        text="This Month",
        bg = COLORS["bg_sidebar"],
        command= lambda: apply_filter("month"),
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
    )
    all_button = tk.Button(
        filter_frame,
        text="All Time",
        bg = COLORS["accent"],
        command=lambda: apply_filter("all"),
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
    )
    #placing
    page_title.pack(anchor="w",padx=20,pady=15)
    tab_frame.pack(fill="x",padx=20,pady=5)
    spending_breakdown_button.grid(row=0,column=0,sticky="ew",padx=10)
    monthly_trend_button.grid(row=0,column=1,sticky="ew",padx=10)
    filter_frame.pack(fill="x",padx=20,pady=15)

    tab_frame.columnconfigure(0, weight=1) # all weight 1 means all 2 columns will take up equal space until there is no blank
    tab_frame.columnconfigure(1, weight=1)

    filter_frame.columnconfigure(0, weight=1)
    filter_frame.columnconfigure(1, weight=1)
    filter_frame.columnconfigure(2, weight=1)

    week_button.grid(row=0, column=0, sticky="ew", padx=5)
    month_button.grid(row=0, column=1, sticky="ew", padx=5)
    all_button.grid(row=0, column=2, sticky="ew", padx=5)

    chart_container.pack(fill="both", expand=True)

    donut_frame.pack(fill="both",padx=20,pady=15)
    bar_frame.pack(fill="both",padx=20,pady=15)
    #charts
    if not transactions:
        tk.Label(
            chart_container,
            text="No transaction data available",
            bg=COLORS["bg_card"],
            fg=COLORS["text_secondary"],
            font = ("Segoe UI", 13)
        ).pack(fill="x",pady=5)
    else:
        def build_donut_chart():
            transactions = get_filtered_transactions()
            fig, ax = plt.subplots(figsize=(6, 4))
            labels = []
            sizes = []
            category_totals = {}
            for transaction in transactions:
                if transaction["type"] == "expense":
                    category = transaction["category"]
                    if category not in category_totals:
                        category_totals[category] = 0
                    category_totals[category] += transaction["amount"]
            for category in category_totals:
                labels.append(category)
                sizes.append(category_totals[category])
                        
            #draw donut
            def autopct_format(pct):
                return f"{pct:.1f}%" if pct >= 5 else "" #only appear category greater than 3 or else: returns empty string
            wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            autopct=autopct_format,
            wedgeprops=dict(width=0.6),
            pctdistance=0.75,
            )
            ax.set_title("Spending by Category",pad=20,fontweight="bold")
            ax.axis("equal")
            for text in autotexts:
                text.set_fontsize(9)
            #setting donut inside the page      
            canvas = FigureCanvasTkAgg(fig, master=donut_frame) # master means the parent frame we place this canvas
            canvas.draw()
            canvas.get_tk_widget().pack(fill="both")
            #adding color to this donut chart - transparent
            fig.patch.set_facecolor(COLORS["bg_main"])
            ax.set_facecolor(COLORS["bg_main"])
            plt.close(fig) #close to prevent rebuild manytime

        def build_bar_chart():
            transactions = get_filtered_transactions() 
            monthly = {}
            # for transaction date 
            for transaction in transactions:
                month = datetime.strptime(transaction["time"], "%Y-%m-%d").strftime("%Y-%m")
                if month not in monthly:
                    monthly[month] = {"income": 0, "expense": 0}
                monthly[month][transaction["type"]] += transaction["amount"]
            # sort by month 
            monthly = dict(merge_sort(monthly.items()))

            fig, ax = plt.subplots(figsize=(8, 5))
            months = []
            income_totals  = []
            expense_totals = []
            for month in monthly:
                months.append(month)
                income_totals.append(monthly[month]["income"])
                expense_totals.append(monthly[month]["expense"])      
        
            x = np.arange(len(months)) # x asix positioned by each month
            width = 0.35 # width for each bar

            #side by side bars 
            income_bars = ax.bar(x - width/2, income_totals, width, label="Income", color=COLORS["status_acceptable"])
            expense_bars = ax.bar(x + width/2, expense_totals, width, label="Expense", color=COLORS["status_exceeded"])

            ax.set_xticks(x)
            ax.set_xticklabels(months)
            ax.legend()
            ax.set_title("Monthly Income vs Expense")
            #set transparent background
            fig.patch.set_facecolor(COLORS["bg_main"])
            ax.set_facecolor(COLORS["bg_main"])
            #setting bar chart inside charts page
            canvas = FigureCanvasTkAgg(fig, master=bar_frame) # master means the parent frame we place this canvas
            canvas.draw()
            canvas.get_tk_widget().pack(fill="both")
            #stop rebuild
            plt.close(fig)
    #function call
    show_donut()