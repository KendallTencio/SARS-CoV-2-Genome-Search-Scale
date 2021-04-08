//Author: Kendall Tencio Esquivel
//Description: This component manages the aspects of drawing and cleaning of the data.

import { Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { DataModel, DataModelLoc } from 'src/app/data/data.model';
import * as d3 from 'd3';
declare var $: any; 
import * as $ from 'jquery';

@Component({
  selector: 'app-bar-chart',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.scss']
})
export class BarChartComponent implements OnInit {
  @ViewChild('chart', {static: false}) private chartContainer: ElementRef;

  //Data Models
  @Input() data: DataModel[];
  @Input() data_gene_segments: DataModelLoc[];
  @Input() data_protein_segments: DataModelLoc[];
  data_segments: DataModelLoc[];

  //Tests arrays
  @Input() covid_tests_array_names: string[] = [];
  @Input() covid_tests_array_segm: string[] = [];

  //Default input
  strValueFromInput: string;
  sectorValueToSearch: string;

  //Button locks
  button_lock_position: boolean = false;
  button_lock_sector: boolean = false;
  button_lock_gene: boolean = false;
  button_lock_prot: boolean = false;
  button_lock_geneprot: boolean = false;

  //File input
  mutations_array_from_file: string[] = [];
  file_uploaded: boolean = false;
  file_uploaded_name: string = "Choose a .CSV file";

  manual_submit: boolean = false;
  file_submit: boolean = false;
  file_new: boolean = false;

  //Radiobutton data
  gene_locations_selected: boolean = false;
  protein_locations_selected: boolean = false;

  //Chart data
  private dataChart: DataModel[];
  private contentWidth: any;
  private contentHeight: any;
  private x: any;
  private y: any;
  private g: any;
  margin = {top: 30, right: 20, bottom: 17, left: 20};

  //Colors for tests
  private color_array_for_tests: string[] = ["#FFDD79", "#FF8E88", "#FFCB7C", "#C297F0"]; 
  private color_array_index: number = 0;

  //Misc variables
  numValueFromInput: number;
  error_display_text: string;
  selected_gene_test: string = "";
  error_code: number = 0;
  current_gene_target_test: string = "";

  constructor() { this.dataChart = this.data; }

  ngOnInit(){
    $('[data-toggle="popover"]').popover();
    if (!this.data) { return; }
    this.createChart(true);
  }

  setManualSelected(){ this.manual_submit = true; this.file_submit = false; }

  setUploadSelected(){ this.manual_submit = false; this.file_submit = true; }

  getSectorPositionValue(sec_pos_value)
  {
    var sec_pos_array = sec_pos_value.split('_');
    var sec = sec_pos_array[0];
    var pos = sec_pos_array[1];

    if(sec_pos_array.length == 2){
      if(pos != '' && sec != ''){
        pos = pos.replace(/\D/g,'');  
        this.strValueFromInput = pos;
        this.button_lock_position = true;
        this.sectorValueToSearch = sec;
        this.button_lock_sector = true;
      }
      else{
        this.strValueFromInput = ''; 
        this.sectorValueToSearch = '';
        this.button_lock_position = false; 
        this.button_lock_sector = false;
      }
    }
  }

  //Parsing of the CSV file received
  convertFile(fileInput: any){
    this.file_new = true;
    this.file_uploaded_name = fileInput.target.files[0].name;

    let fileReaded = fileInput.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      let csv_string = reader.result as string;
      let csv_array = csv_string.split(/\r?\n/)
      
      this.extractMutations(csv_array);
    };
    reader.readAsText(fileReaded);
  }

  extractMutations(csv_array){
    let mutations_array = [];
    csv_array.forEach(element => { mutations_array.push(element.split(',')[1]); });
    mutations_array.shift(); //Delete the column name from the csv (named "mutation")
    this.mutations_array_from_file = mutations_array;
    this.file_uploaded = true;
  }

  setGeneSelected($event: any) {
    if ($event.target.checked === true) {
        this.button_lock_gene = true;
        this.button_lock_prot = false;
        this.button_lock_geneprot = true;
        this.gene_locations_selected = true;
        this.protein_locations_selected = false;
    }
  }

  setProtSelected($event: any) {
    if ($event.target.checked === true) {
        this.button_lock_prot = true;
        this.button_lock_gene = false;
        this.button_lock_geneprot = true;
        this.protein_locations_selected = true;
        this.gene_locations_selected = false;
    }
  }

  addValueInGraph(){ //Needs improvement
    this.error_display_text = "";
    let errorDetected = false;
    this.setDataSegments();

    if(!this.file_submit){ //Check if a file uploaded is selected!
      if((this.strValueFromInput == "") || (this.button_lock_position !== true) || (this.button_lock_sector !== true) || (this.button_lock_geneprot !== true)){
        this.error_code = 5;
        this.errorHandler();
        return;
      }

      this.numValueFromInput = +this.strValueFromInput;
  
      //If no sector is selected, put the first sector as default.
      if(this.sectorValueToSearch == null){ this.sectorValueToSearch = this.data_segments[0].segment_name; }
      let sector_index = this.getSectorIndexByName(this.sectorValueToSearch);
  
      if(this.validGivenPosition(this.data_segments[sector_index], this.numValueFromInput)){
        var sector_position = this.data_segments[sector_index].start + this.numValueFromInput;
        this.data[sector_position].selected = 1; 
        this.onResize();
      }
      else{ this.errorHandler(); }
    }
    else if(this.file_new && this.file_submit){
      if(this.button_lock_geneprot !== true){ this.error_code = 5; this.errorHandler(); return; }

      if(this.mutations_array_from_file.length == 0){ this.error_code = 4; this.errorHandler(); return; }

      this.cleanSearch();
      for (let i = 0; i < this.mutations_array_from_file.length; i++) {
        if(this.mutations_array_from_file[i] == null){ continue; }
        
        let position_sector_array = this.parseElementFromFile(this.mutations_array_from_file[i]);
        if(position_sector_array == null){ this.error_code = 3; errorDetected = true; break; }

        let position = position_sector_array[0];
        let sector_name = position_sector_array[1];
        if(this.setSelectedStateInData(position, sector_name)){ continue; }
        else{ this.error_code = 3; errorDetected = true; break; }
      }

      if(!errorDetected){ this.file_uploaded_name = "Choose a .CSV file"; console.log(this.file_uploaded_name); this.file_new = false; this.onResize(); }
      else{ this.errorHandler(); }
    }
  }

  parseElementFromFile(mutation_element){
    var sec_pos_array = mutation_element.split('_');
    var sec = sec_pos_array[0];
    var pos = sec_pos_array[1];
    var mutation_returning_array = [];

    if(sec_pos_array.length == 2){
      if(pos != '' && sec != ''){
        pos = pos.replace(/\D/g,'');  
        mutation_returning_array.push(pos);
        mutation_returning_array.push(sec);
        return mutation_returning_array;
      }
      else{ this.error_code = 7; this.errorHandler(); }
    }
  }

  setSelectedStateInData(position, sector_name){
    if(sector_name == null){ sector_name = this.data_segments[0].segment_name; }
    var sector_index = this.getSectorIndexByName(sector_name);

    position = +position;
    if(this.validGivenPosition(this.data_segments[sector_index], position)){
      var sector_position = this.data_segments[sector_index].start + position;
      this.data[sector_position].selected = 1; 
      return true;
    }
    else{ this.errorHandler(); return false; }
  }

  setDataSegments(){
    if(this.gene_locations_selected){ this.data_segments = this.data_gene_segments; }
    else if(this.protein_locations_selected){ this.data_segments = this.data_protein_segments; }
  }

  getSectorIndexByName(sector_name){
    var counter_index = 0;
    this.setDataSegments();
    for(let element of this.data_segments){ if(element.segment_name == sector_name){ break; } counter_index++; }
    return counter_index;
  }

  validGivenPosition(sector_element, position_value){
    if(sector_element != null){
      if((sector_element.start + position_value) > sector_element.end){ this.error_code = 1; return false; }
      return true;
    }
    else{ this.error_code = 2; return false; }
  }

  validSectorNoNull(sector_element){ if(sector_element != null){ return true; } else{ return false; } }

  selectChangeHandler ($event: any) { this.selected_gene_test = $event.target.value; }

  drawCovidTestsGeneTargets(test_name_selected, store_line){
    if(test_name_selected != ""){
      const index_test = this.covid_tests_array_names.findIndex(x => x == test_name_selected);
      const segments_names = this.covid_tests_array_segm[index_test];
      let segments_arr = segments_names.split(' ');
      let index_segment;

      for (let i = 0; i < segments_arr.length; i++) {
        //Provitional IF (We don't have the current locations for "N1 N2 N3")
        if(segments_arr[i] == "N1" || segments_arr[i] == "N2" || segments_arr[i] == "N3"){ segments_arr[i] = "N" }
        
        index_segment = this.data_gene_segments.findIndex(x => x.segment_name == segments_arr[i]);
        if(this.validSectorNoNull(this.data_gene_segments[index_segment])){
          this.drawLineMarker(this.data_gene_segments[index_segment].start, 
                            this.data_gene_segments[index_segment].end, 
                            this.data_gene_segments[index_segment].segment_name);
        }
        else{
          index_segment = this.data_protein_segments.findIndex(x => x.segment_name == segments_arr[i]);
          if(this.validSectorNoNull(this.data_protein_segments[index_segment])){
            this.drawLineMarker(this.data_protein_segments[index_segment].start, 
                              this.data_protein_segments[index_segment].end, 
                              this.data_protein_segments[index_segment].segment_name);
          }
          else{ store_line = false; break; }
        }
      }
      if(store_line){ this.current_gene_target_test = test_name_selected; }
    }
  }

  markGeneTargetLines(){
    if(!this.g){ this.createChart(true); }
    this.cleanGeneTargetLines();
    this.drawCovidTestsGeneTargets(this.selected_gene_test, true);
  }

  markCurrentTestLine(){ if(this.current_gene_target_test != ""){ this.drawCovidTestsGeneTargets(this.current_gene_target_test, false); } }

  //Draw a line for a segment in a test
  drawSymbolForRdRp(x1, segment_name){
    let symbolGenerator = d3.symbol().type(d3.symbolStar).size(80);

    let pathData = symbolGenerator();

    this.g.append("path")
      .attr('d', pathData)
      .attr("id", "texttest")
      .attr("fill", "#FFCB7C")
      .attr('stroke', 'black')
      .attr('transform', 'translate(' + (this.x(x1) - 10) + ',' + -20 + ')');

    this.g.append("text")
      .style("font-size", "14px")
      .attr("font-family", "Saira")
      .attr("font-weight", "bold")
      .attr("id", "texttest")
      .attr("x", this.x(x1))
      .attr("y", -12)
      .text(segment_name);
  }

  //Draw a line for a segment in a test
  drawLineMarker(x1, x2, segment_name){
    if(this.color_array_index >= this.color_array_for_tests.length){ this.color_array_index = 0; }

    var color = this.color_array_for_tests[this.color_array_index]; //From an array select a color
    this.color_array_index++;

    this.g.append("line")    
      .style("stroke", color) 
      .style('stroke-width', '5px')
      .attr("id", "linetest")
      .attr("x1", this.x(x1))    
      .attr("y1", -8)     
      .attr("x2", this.x(x2))     
      .attr("y2", -8);  

    if(segment_name == "RdRp") { this.drawSymbolForRdRp(x1, segment_name) }    
    else{
      this.g.append("text")
      .style("font-size", "12px")
      .attr("font-family", "Saira")
      .attr("font-weight", "bold")
      .attr("id", "texttest")
      .attr("x", this.x(x1))
      .attr("y", -12)
      .text(segment_name);
    }
  }
  
  //Draw a bar for a searched position in the genome
  drawSearchBar(data, contentWidth, contentHeight){
    this.g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
        .style("fill", d => d.color)
        .attr('class', 'bar')
        .attr('x', d => this.x(parseInt(d.num_value)-35))
        .attr('y', d => this.y(d.selected))
        .attr("width", (contentWidth/data.length)*70)
        .attr('height', d => contentHeight - this.y(d.selected));
  }

  //Create chart that draws with previous content
  private createChart(isInit: boolean): void {
    d3.select("svg").remove();
    const element = this.chartContainer.nativeElement;

    this.dataChart = this.data;
    const svg = d3.select(element).append('svg')
        .attr('width', element.offsetWidth)
        .attr('height', element.offsetHeight);

    this.contentWidth = element.offsetWidth - this.margin.left - this.margin.right;
    this.contentHeight = element.offsetHeight - this.margin.top - this.margin.bottom;

    this.x = d3.scaleLinear()
               .domain([0, d3.max(this.dataChart, d => parseInt(d.num_value))])
               .rangeRound([0, this.contentWidth]);

    this.y = d3
      .scaleLinear()
      .rangeRound([this.contentHeight, 0])
      .domain([0, d3.max(this.dataChart, d => d.selected)]);

    this.g = svg.append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    const xAxisGenerator = d3.axisBottom(this.x);
    xAxisGenerator.ticks(6);

    this.g.append('g')
      .attr('class', 'axis axis--x')
      .attr('transform', 'translate(0,' + this.contentHeight + ')')
      .call(xAxisGenerator);

    if(!isInit){
      this.markCurrentTestLine();
      this.drawSearchBar(this.dataChart, this.contentWidth, this.contentHeight);
    }
  }

  //Cleaners
  cleanSearch(){
    if(this.g){
      this.error_display_text = "";
      this.cleanGeneTargetLines();
      this.data.forEach(element => { element.selected = 0; });
    }
    this.createChart(true);
  }

  cleanGeneTargetLines(){ this.g.selectAll("#linetest").remove(); this.g.selectAll("#texttest").remove(); }

  onResize() { this.createChart(false); }

  //Error messages handlers
  errorHandler(){
    switch (this.error_code) {
      case 1:
        this.error_display_text = "ERROR: Invalid position";
        break;
      case 2:  
        this.error_display_text = "ERROR: Invalid sector";
        break;
      case 3:  
        this.error_display_text = "ERROR: File. Please check the type of data, the sectors or the positions included";
        break;
      case 4:  
        this.error_display_text = "ERROR: File not uploaded!";
        break;
      case 5:  
        this.error_display_text = "ERROR: Check that you have correctly entered the 'Type of submit' and the 'Type of data'";
        break;
      case 6:
        this.error_display_text = "Manual value not valid.";
        break;
      case 7:
          this.error_display_text = "ERROR: Couldn't parse mutations in file.";
          break;
      default:
        this.error_display_text = "ERROR: Default error detected. Please check the procedure.";
        break;
    }
  }
}