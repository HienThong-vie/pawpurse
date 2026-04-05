import tkinter as tk
import tkinter.ttk as ttk
from colors_scheme import COLORS
from core.algorithm import generate_advice

def build_advisor_page(frame,data):
    #pack_forget use to show/hide behavior
    def show_all():
        ungroup_label.pack(anchor="w", padx=20, pady=15)
        ungroup_frame.pack(fill="x", padx=20, pady=10)
        showall_button.configure(bg=COLORS["accent"])
        showgroup_button.configure(bg=COLORS["bg_sidebar"])
        grouped_label.pack_forget()
        grouped_frame.pack_forget()
    def show_group():
        grouped_label.pack(anchor="w", padx=20, pady=15)
        grouped_frame.pack(fill="x", padx=20, pady=10)
        showgroup_button.configure(bg=COLORS["accent"])
        showall_button.configure(bg=COLORS["bg_sidebar"])
        ungroup_label.pack_forget()
        ungroup_frame.pack_forget()


    advices =  generate_advice(data)

    page_title = tk.Label(
        frame,
        text = "🤖 Advisor",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font = ("Segoe UI", 18, "bold")
    )
    controls_frame = tk.Frame(
        frame,
        bg = COLORS["bg_main"]   
    )
    showall_button = tk.Button(
        controls_frame,
        command = show_all,
        text = "🌐 Show All",
        bg=COLORS["accent"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
    )
    showgroup_button = tk.Button(
        controls_frame,
        command = show_group,
        text = "📚 Show Group",
        bg=COLORS["accent"],
        fg=COLORS["text_light"],
        font=("Segoe UI", 10,"bold"),
        cursor="hand2",
    )

    page_title.pack(anchor="w",padx=20,pady=15)
    controls_frame.pack(fill="x",padx=20,pady=5)

    showall_button.grid(row=0,column=0,sticky="ew",padx=10)
    showgroup_button.grid(row=0,column=1,sticky="ew",padx=10)

    controls_frame.columnconfigure(0, weight=1)
    controls_frame.columnconfigure(1, weight=1)
    

    #ungroup advices section 

    ungroup_label = tk.Label(
        frame,
        text = "Ungroup View",
        bg= COLORS["bg_main"],
        fg= COLORS["text_primary"],
        font = ("Segoe UI", 13, "bold"),
    )
    ungroup_frame = tk.LabelFrame(
        frame,
        text = "",
        bg=COLORS["bg_card"],
        fg=COLORS["text_secondary"]
    )
    ungroup_label.pack(anchor="w",padx=20,pady=15)
    ungroup_frame.pack(fill="x",padx=20,pady=10)
    if not advices:
        tk.Label(
            ungroup_frame,
            text="No alerts at this time.",
            bg=COLORS["bg_card"],
            fg=COLORS["text_secondary"],
            font = ("Segoe UI", 13)
        ).pack(fill="x",pady=5)
    else:
        for advice in advices:
            if advice.startswith("🔴"):
                bg_color = COLORS["status_exceeded"]
            elif advice.startswith("⚠️"):
                bg_color = COLORS["status_warning"]
            elif advice.startswith("🟡"):
                bg_color = COLORS["status_caution"]
            else:
                bg_color = COLORS["status_acceptable"]
        
            advice = tk.Label(
            ungroup_frame,
            text = advice,
            bg = bg_color,
            fg=COLORS["text_primary"],
            font=("Segoe UI", 10),
            anchor="w"
            )
            advice.pack(fill="x", padx=10, pady=3, anchor="w")

    #grouped secion
    grouped_label = tk.Label(
        frame,
        text = "Grouped View",
        bg= COLORS["bg_main"],
        fg= COLORS["text_primary"],
        font = ("Segoe UI", 13, "bold"),
    )
    grouped_frame = tk.LabelFrame(
        frame,
        text = "",
        bg=COLORS["bg_card"],
        fg=COLORS["text_secondary"]
    )
    grouped_label.pack(anchor="w",padx=20,pady=15)
    grouped_frame.pack(fill="x",padx=20,pady=10)
    if not advices:
        tk.Label(
            grouped_frame,
            text="No alerts at this time.",
            bg=COLORS["bg_card"],
            fg=COLORS["text_secondary"],
            font = ("Segoe UI", 13)
        ).pack(fill="x",pady=5)
    else:
        exceeded_label =tk.Label(
            grouped_frame,
            text="EXCEEDED",
            bg= COLORS["bg_card"],
            fg=COLORS["text_primary"],
            font = ("Segoe UI", 13, "bold")
        )
        warning_label = tk.Label(
            grouped_frame,
            text="WARNING",
            bg= COLORS["bg_card"],
            fg=COLORS["text_primary"],
            font = ("Segoe UI", 13, "bold")
        )
        caution_label = tk.Label(
            grouped_frame,
            text="CAUTION",
            bg= COLORS["bg_card"],
            fg=COLORS["text_primary"],
            font = ("Segoe UI", 13, "bold")
        )
        acceptable_label = tk.Label(
            grouped_frame,
            text="ACCEPTABLE",
            bg= COLORS["bg_card"],
            fg=COLORS["text_primary"],
            font = ("Segoe UI", 13, "bold")
        )
        exceeded_advice = []
        warning_advice = []
        caution_advice = []
        acceptable_advice = []

        for advice in advices:
            if advice.startswith("🔴"):
                exceeded_advice.append(advice)
            elif advice.startswith("⚠️"):
                warning_advice.append(advice)
            elif advice.startswith("🟡"):
                caution_advice.append(advice)
            else:
                acceptable_advice.append(advice) 
        if exceeded_advice:
            exceeded_label.pack(anchor="w",padx=5)
        for advice in exceeded_advice:
            bg_color = COLORS["status_exceeded"]
            exceeded = tk.Label(
                grouped_frame,
                text = advice,
                bg=bg_color,
                fg=COLORS["text_primary"],
                font=("Segoe UI", 10),
                anchor="w"
            )
            exceeded.pack(fill="x",expand=True,padx=5,pady=5)
        if warning_advice:
            warning_label.pack(anchor="w",padx=5)
        for advice in warning_advice:
            bg_color = COLORS["status_warning"]
            warning = tk.Label(
                grouped_frame,
                text = advice,
                bg=bg_color,
                fg=COLORS["text_primary"],
                font=("Segoe UI", 10),
                anchor="w"
            )
            warning.pack(fill="x",expand=True,padx=5,pady=5)
        if caution_advice:
            caution_label.pack(anchor="w",padx=5)
        for advice in caution_advice:
            bg_color = COLORS["status_caution"]
            caution = tk.Label(
                grouped_frame,
                text = advice,
                bg=bg_color,
                fg=COLORS["text_primary"],
                font=("Segoe UI", 10),
                anchor="w"
            )
            caution.pack(fill="x",expand=True,padx=5,pady=5)

        if acceptable_advice:
            acceptable_label.pack(anchor="w",padx=5)
        for advice in acceptable_advice:
            bg_color = COLORS["status_acceptable"]
            acceptable = tk.Label(
                grouped_frame,
                text = advice,
                bg=bg_color,
                fg=COLORS["text_primary"],
                font=("Segoe UI", 10),
                anchor="w"
            )
            acceptable.pack(fill="x",expand=True,padx=5,pady=5) 

    show_all()