Spacewalk Text Format

1st line \-- \#\#format directive followed by whitespace-delimited pairs of key-value properties

* Format specifier (required)  
* Name (required)  
* Genome identifier (required). UCSC or Genome Reference Consortium identifiers should be used when available (e.g. hg38, GRCh38)


2nd line \-- six (6) column headings, whitespace-delimited

Remaining lines \- blocks of trace data.   Each block begins with a “trace” line followed by data lines. All tokens are whitespace delimited (tab, space, etc.)

Example 1 \- Optical Reconstruction of Chromatin Architecture (ORCA) style data. Also called ball & stick data. Each data record lists a geometric location with an associated genomic range:

**genomic range**		  
**chr21 28000000 28030000**

**geometric location**		  
**73152 6517 1797**

**\#\#format=sw1 name=IM90 genome=hg19**  
**chromosome	   start	  end	x	y	z**  
**trace 0**  
**chr21 28000000 28030000 73152 6517 1797**  
**chr21 28030000 28060000 73113 6643 1709**  
**chr21 28060000 28090000 73488 6191 1494**  
**chr21 28090000 28120000 73590 6754 1787**  
**chr21 28120000 28150000 73235 6561 1677**

**trace 1**  
**chr21 28000000 28030000 73152 6517 1797**  
**chr21 28030000 28060000 73113 6643 1709**  
**chr21 28060000 28090000 73488 6191 1494**  
**chr21 28090000 28120000 73590 6754 1787**  
**chr21 28120000 28150000 73235 6561 1677**  
Example 2 \- OligoSTORM style data. Also called point cloud data. Similar to Example 1, each data record lists a geometric location with an associated genomic range.  The difference here is successive data records replicate the same genomic range but for a different geometric location:

**genomic range**  
**chr19 7400000	8680000**

**multiple geometric locations**  
**10105	5855		533**  
**9603		6037		585**  
**9456		5876		687**  
**9445		5968		526**  
**9573		5947		508**

**\#\#format=sw1	name=PGP1	genome=hg19**  
**chromosome	start	end	x	y	z**  
**trace	0**  
**chr19	7400000	8680000	10105	5855 	533**  
**chr19	7400000	8680000	9603		6037		585**  
**chr19	7400000	8680000	9456		5876		687**  
**chr19	7400000	8680000	9445		5968		526**  
**chr19	7400000	8680000	9573		5947		508**  
**trace	1**  
**chr19	7400000	8680000	13097	12911	540**  
**chr19	7400000	8680000	13072	12995	\-93**  
**chr19	7400000	8680000	12769	12971	592**  
**chr19	7400000	8680000	13121	12784	684**  
**chr19	7400000	8680000	13491	11733	346**  
**trace	2**  
**chr19	7400000	8680000	10495	13019	699**  
**chr19	7400000	8680000	10654	13193	1003**  
**chr19	7400000	8680000	10628	13226	900**  
**chr19	7400000	8680000	10618	13207	883**  
**chr19	7400000	8680000	10659	13218	883**  
