export interface DataModel {
    num_value: string;
    selected: number;
    color: string;
  }

export interface DataModelLoc {
  segment_name: string;
  start: number;
  end: number;
}

export interface DataModelTests {
  test_name: string;
  gene_targets: string;
}
