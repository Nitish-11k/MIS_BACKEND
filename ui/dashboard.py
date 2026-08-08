import sys
import os
from PyQt5.QtWidgets import (QApplication, QMainWindow, QWidget, QVBoxLayout, 
                             QHBoxLayout, QLabel, QLineEdit, QPushButton, 
                             QFileDialog, QTextEdit, QMessageBox)
from PyQt5.QtCore import Qt, QThread, pyqtSignal

# Import our exporter functions
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from exporter.extract import extract_gz_to_txt
from exporter.to_excel import txt_to_excel


class ConverterWorker(QThread):
    log_signal = pyqtSignal(str)
    finished_signal = pyqtSignal(bool, str)

    def __init__(self, gz_path, out_dir):
        super().__init__()
        self.gz_path = gz_path
        self.out_dir = out_dir

    def run(self):
        try:
            self.log_signal.emit(f"Starting extraction of {os.path.basename(self.gz_path)}...")
            txt_path = extract_gz_to_txt(self.gz_path, self.out_dir)
            
            if not txt_path or not os.path.exists(txt_path):
                self.finished_signal.emit(False, "Failed to extract .gz file.")
                return
                
            self.log_signal.emit("Extraction complete. Starting Excel conversion...")
            excel_path = txt_to_excel(txt_path, self.out_dir)
            
            if not excel_path or not os.path.exists(excel_path):
                self.finished_signal.emit(False, "Failed to convert to Excel.")
                return
                
            self.log_signal.emit(f"Success! File saved to:\n{excel_path}")
            
            # Clean up the intermediate txt file
            try:
                os.remove(txt_path)
                self.log_signal.emit("Cleaned up temporary .txt file.")
            except:
                pass
                
            self.finished_signal.emit(True, "Conversion successful!")
            
        except Exception as e:
            self.finished_signal.emit(False, f"An error occurred: {str(e)}")


class Dashboard(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Bank MIS to Excel Converter")
        self.setMinimumSize(600, 400)
        
        # Main widget and layout
        main_widget = QWidget()
        self.setCentralWidget(main_widget)
        layout = QVBoxLayout(main_widget)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)
        
        # Title
        title = QLabel("MIS Report Converter")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-size: 24px; font-weight: bold; margin-bottom: 10px;")
        layout.addWidget(title)
        
        # Input Section
        input_layout = QHBoxLayout()
        self.input_edit = QLineEdit()
        self.input_edit.setPlaceholderText("Select .txt.gz file...")
        self.input_edit.setReadOnly(True)
        
        input_btn = QPushButton("Browse File")
        input_btn.clicked.connect(self.browse_input)
        
        input_layout.addWidget(QLabel("Input File:"))
        input_layout.addWidget(self.input_edit)
        input_layout.addWidget(input_btn)
        layout.addLayout(input_layout)
        
        # Output Section
        output_layout = QHBoxLayout()
        self.output_edit = QLineEdit()
        self.output_edit.setPlaceholderText("Select destination folder...")
        self.output_edit.setReadOnly(True)
        
        output_btn = QPushButton("Browse Folder")
        output_btn.clicked.connect(self.browse_output)
        
        output_layout.addWidget(QLabel("Output Folder:"))
        output_layout.addWidget(self.output_edit)
        output_layout.addWidget(output_btn)
        layout.addLayout(output_layout)
        
        # Convert Button
        self.convert_btn = QPushButton("Convert to Excel")
        self.convert_btn.setMinimumHeight(40)
        self.convert_btn.setStyleSheet("font-size: 16px; font-weight: bold; background-color: #4CAF50; color: white;")
        self.convert_btn.clicked.connect(self.start_conversion)
        layout.addWidget(self.convert_btn)
        
        # Status Log
        layout.addWidget(QLabel("Status Log:"))
        self.log_text = QTextEdit()
        self.log_text.setReadOnly(True)
        layout.addWidget(self.log_text)

    def browse_input(self):
        file_path, _ = QFileDialog.getOpenFileName(self, "Select GZ File", "", "Gzip Files (*.gz);;All Files (*)")
        if file_path:
            self.input_edit.setText(file_path)
            
            # Automatically set output folder to the same directory if not already set
            if not self.output_edit.text():
                self.output_edit.setText(os.path.dirname(file_path))

    def browse_output(self):
        dir_path = QFileDialog.getExistingDirectory(self, "Select Output Directory")
        if dir_path:
            self.output_edit.setText(dir_path)

    def log(self, message):
        self.log_text.append(message)

    def start_conversion(self):
        gz_path = self.input_edit.text()
        out_dir = self.output_edit.text()
        
        if not gz_path:
            QMessageBox.warning(self, "Error", "Please select an input file first.")
            return
            
        if not out_dir:
            out_dir = os.path.dirname(gz_path)
            self.output_edit.setText(out_dir)
            
        self.convert_btn.setEnabled(False)
        self.log_text.clear()
        
        # Run in background thread to prevent GUI freezing
        self.worker = ConverterWorker(gz_path, out_dir)
        self.worker.log_signal.connect(self.log)
        self.worker.finished_signal.connect(self.conversion_finished)
        self.worker.start()

    def conversion_finished(self, success, message):
        self.convert_btn.setEnabled(True)
        if success:
            QMessageBox.information(self, "Success", message)
        else:
            QMessageBox.critical(self, "Error", message)

def main():
    app = QApplication(sys.argv)
    
    # Simple styling
    app.setStyle('Fusion')
    
    window = Dashboard()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
